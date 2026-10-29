"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { accounts, auditLog, sessions, users } from "@/db/schema";
import { sql } from "@/db";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { headers } from "next/headers";

const emailSchema = z.object({ email: z.email().max(200) });

export interface SignInState {
  error?: "invalid" | "rate" | "failed";
}

/** Magic-link request. The response never reveals whether the address already has an account (no enumeration). */
export async function requestMagicLink(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = emailSchema.safeParse({ email: String(form.get("email") ?? "").trim().toLowerCase() });
  if (!parsed.success) return { error: "invalid" };
  const h = await headers();
  const rl = await rateLimit(`magic:${clientIp(h)}`, 6, 600);
  const rlEmail = await rateLimit(`magic-email:${parsed.data.email}`, 3, 600);
  if (!rl.ok || !rlEmail.ok) return { error: "rate" };
  try {
    // redirect:false → Auth.js sends the email and returns; we navigate ourselves to a *page* route
    // (a server-action redirect to /api/auth/verify-request would be fetched as RSC and hang).
    await signIn("email", { email: parsed.data.email, redirect: false });
  } catch (e) {
    console.error("[auth] magic link failed", e);
    return { error: "failed" };
  }
  redirect("/entrar/verificar");
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/conta" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

const onboarding = z.object({
  name: z.string().trim().min(2).max(120),
  profileType: z.enum(["private", "agent", "agency", "investor", "developer"]),
  amiNumber: z
    .string()
    .trim()
    .max(20)
    .regex(/^\d{3,6}$/)
    .optional()
    .or(z.literal("")),
});

export interface OnboardingState {
  error?: boolean;
}

export async function completeOnboarding(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const parsed = onboarding.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: true };
  const d = parsed.data;
  const professional = d.profileType === "agent" || d.profileType === "agency";
  await db
    .update(users)
    .set({
      name: d.name,
      profileType: d.profileType,
      amiNumber: professional && d.amiNumber ? d.amiNumber : null,
      // Verification is manual/by registry lookup; the product never self-certifies a licence.
      amiStatus: professional && d.amiNumber ? "pending" : "none",
      onboardedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));
  await db.insert(auditLog).values({ actorId: session.user.id, action: "user.onboarded", entity: "user", entityId: session.user.id, meta: { profileType: d.profileType } });
  redirect("/conta");
}

/** RGPD erasure: personal data removed, row kept (anonymised) so foreign keys and audit trails stay valid. */
export async function deleteAccount(form: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  if (form.get("confirm") !== "on") return;
  const id = session.user.id;
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(accounts).where(eq(accounts.userId, id));
  await sql`DELETE FROM saved_searches WHERE user_id = ${id}`;
  await db
    .update(users)
    .set({ name: null, image: null, phone: null, amiNumber: null, email: `deleted+${id}@invalid.local`, deletedAt: new Date() })
    .where(and(eq(users.id, id)));
  await db.insert(auditLog).values({ actorId: null, action: "user.deleted", entity: "user", entityId: id });
  redirect("/");
}
