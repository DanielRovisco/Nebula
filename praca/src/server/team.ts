"use server";

import { randomBytes } from "node:crypto";
import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/db";
import { TeamInviteEmail } from "@/emails/team-invite";
import { siteUrl } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { audit } from "./audit";
import { sendMail } from "./email";
import { getOrgContext, roleAtLeast } from "./org";
import { currentUser } from "./session";

export interface TeamState {
  ok?: boolean;
  error?: "auth" | "invalid" | "permission" | "seats" | "exists" | "self";
}

const nameSchema = z.string().trim().min(2).max(80);

export async function createOrganization(_prev: TeamState, form: FormData): Promise<TeamState> {
  const u = await currentUser();
  if (!u) return { error: "auth" };
  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success) return { error: "invalid" };
  if (await getOrgContext()) return { error: "exists" };
  let slug = slugify(name.data) || "equipa";
  const [taken] = await sql`SELECT 1 FROM organizations WHERE slug = ${slug}`;
  if (taken) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  const [o] = await sql<{ id: string }[]>`INSERT INTO organizations (name, slug, kind, email) VALUES (${name.data}, ${slug}, 'agency', ${u.email}) RETURNING id`;
  await sql`INSERT INTO memberships (organization_id, user_id, role) VALUES (${o!.id}, ${u.id}, 'owner')`;
  await audit(u.id, o!.id, "org.created", "organization", o!.id, { name: name.data });
  revalidatePath("/equipa");
  return { ok: true };
}

const brandSchema = z.object({
  name: nameSchema,
  logoUrl: z.union([z.literal(""), z.url().max(500).refine((v) => /^https?:\/\//.test(v))]),
  brandColor: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/)]),
  email: z.union([z.literal(""), z.email().max(200)]),
  phone: z.string().trim().max(30).optional(),
  website: z.union([z.literal(""), z.url().max(300)]),
});

export async function updateBrand(_prev: TeamState, form: FormData): Promise<TeamState> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "auth" };
  if (!roleAtLeast(ctx.role, "admin")) return { error: "permission" };
  const p = brandSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "invalid" };
  const d = p.data;
  await sql`UPDATE organizations SET name = ${d.name}, logo_url = ${d.logoUrl || null}, brand_color = ${d.brandColor || null}, email = ${d.email || null}, phone = ${d.phone || null}, website = ${d.website || null}, updated_at = now() WHERE id = ${ctx.orgId}`;
  await audit(ctx.user.id, ctx.orgId, "org.brand_updated", "organization", ctx.orgId);
  revalidatePath("/equipa");
  return { ok: true };
}

/** Seats available: purchased seats of the active team subscription, otherwise the plan entitlement. */
export async function seatLimit(orgId: string): Promise<number> {
  const [r] = await sql<{ seats: number | null; plan: string }[]>`
    SELECT (SELECT seats FROM subscriptions s WHERE s.organization_id = o.id AND s.status IN ('trialing','active','past_due') ORDER BY created_at DESC LIMIT 1) AS seats, o.plan::text AS plan
    FROM organizations o WHERE o.id = ${orgId}`;
  if (r?.seats) return r.seats;
  const [e] = await sql<{ limit_value: number | null }[]>`SELECT limit_value FROM entitlements WHERE plan = ${r?.plan ?? "free"} AND feature = 'seats'`;
  return e?.limit_value ?? 1;
}

const inviteSchema = z.object({ email: z.email().max(200).transform((v) => v.toLowerCase()), role: z.enum(["admin", "agent", "viewer"]) });

export async function inviteMember(_prev: TeamState, form: FormData): Promise<TeamState> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "auth" };
  if (!roleAtLeast(ctx.role, "admin")) return { error: "permission" };
  const p = inviteSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "invalid" };
  const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`
    SELECT (SELECT count(*) FROM memberships WHERE organization_id = ${ctx.orgId}) + (SELECT count(*) FROM invitations WHERE organization_id = ${ctx.orgId} AND accepted_at IS NULL AND expires_at > now())::int AS n`;
  if (Number(n) >= (await seatLimit(ctx.orgId))) return { error: "seats" };
  const token = randomBytes(24).toString("base64url");
  await sql`INSERT INTO invitations (organization_id, email, role, token, invited_by, expires_at) VALUES (${ctx.orgId}, ${p.data.email}, ${p.data.role}, ${token}, ${ctx.user.id}, now() + interval '7 days')`;
  const url = `${siteUrl}/equipa/convite/${token}`;
  await sendMail({ to: p.data.email, subject: `Convite para a equipa ${ctx.orgName} na Praça`, react: createElement(TeamInviteEmail, { orgName: ctx.orgName, inviter: ctx.user.name ?? ctx.user.email, url }), devHint: `Invite link: ${url}` }).catch((e) => console.error("[invite]", e));
  await audit(ctx.user.id, ctx.orgId, "member.invited", "invitation", token.slice(0, 6), { email: p.data.email, role: p.data.role });
  revalidatePath("/equipa");
  return { ok: true };
}

export async function revokeInvitation(id: string) {
  const ctx = await getOrgContext();
  if (!ctx || !roleAtLeast(ctx.role, "admin") || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await sql`DELETE FROM invitations WHERE id = ${id} AND organization_id = ${ctx.orgId}`;
  await audit(ctx.user.id, ctx.orgId, "invitation.revoked", "invitation", id);
  revalidatePath("/equipa");
  return { ok: true };
}

export async function changeRole(membershipId: string, role: "owner" | "admin" | "agent" | "viewer") {
  const ctx = await getOrgContext();
  if (!ctx || !roleAtLeast(ctx.role, "admin") || !/^[0-9a-f-]{36}$/i.test(membershipId)) return { ok: false, error: "permission" as const };
  const [m] = await sql<{ role: string }[]>`SELECT role::text FROM memberships WHERE id = ${membershipId} AND organization_id = ${ctx.orgId}`;
  if (!m) return { ok: false, error: "permission" as const };
  // Only owners can grant or change the owner role; admins manage everyone else.
  if ((role === "owner" || m.role === "owner") && ctx.role !== "owner") return { ok: false, error: "permission" as const };
  if (m.role === "owner" && role !== "owner") {
    const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM memberships WHERE organization_id = ${ctx.orgId} AND role = 'owner'`;
    if (n <= 1) return { ok: false, error: "self" as const }; // an organisation always keeps one owner
  }
  await sql`UPDATE memberships SET role = ${role} WHERE id = ${membershipId} AND organization_id = ${ctx.orgId}`;
  await audit(ctx.user.id, ctx.orgId, "member.role_changed", "membership", membershipId, { role });
  revalidatePath("/equipa");
  return { ok: true };
}

export async function removeMember(membershipId: string) {
  const ctx = await getOrgContext();
  if (!ctx || !/^[0-9a-f-]{36}$/i.test(membershipId)) return { ok: false, error: "permission" as const };
  const [m] = await sql<{ role: string; user_id: string }[]>`SELECT role::text, user_id FROM memberships WHERE id = ${membershipId} AND organization_id = ${ctx.orgId}`;
  if (!m) return { ok: false, error: "permission" as const };
  const self = m.user_id === ctx.user.id;
  if (!self && !roleAtLeast(ctx.role, "admin")) return { ok: false, error: "permission" as const };
  if (m.role === "owner") {
    const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM memberships WHERE organization_id = ${ctx.orgId} AND role = 'owner'`;
    if (n <= 1) return { ok: false, error: "self" as const };
    if (ctx.role !== "owner") return { ok: false, error: "permission" as const };
  }
  await sql`DELETE FROM memberships WHERE id = ${membershipId} AND organization_id = ${ctx.orgId}`;
  await audit(ctx.user.id, ctx.orgId, self ? "member.left" : "member.removed", "membership", membershipId);
  revalidatePath("/equipa");
  return { ok: true };
}

/** Accepts an invitation. The signed-in user's email must match the invited address. */
export async function acceptInvitation(token: string): Promise<{ ok: boolean; error?: "auth" | "invalid" | "email" | "exists" }> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "auth" };
  const [inv] = await sql<{ id: string; organization_id: string; email: string; role: "admin" | "agent" | "viewer" }[]>`
    SELECT id, organization_id, email, role::text AS role FROM invitations WHERE token = ${token} AND accepted_at IS NULL AND expires_at > now()`;
  if (!inv) return { ok: false, error: "invalid" };
  if (inv.email.toLowerCase() !== u.email.toLowerCase()) return { ok: false, error: "email" };
  if (await getOrgContext()) return { ok: false, error: "exists" };
  await sql`INSERT INTO memberships (organization_id, user_id, role) VALUES (${inv.organization_id}, ${u.id}, ${inv.role}) ON CONFLICT DO NOTHING`;
  await sql`UPDATE invitations SET accepted_at = now() WHERE id = ${inv.id}`;
  await audit(u.id, inv.organization_id, "member.joined", "membership", u.id, { role: inv.role });
  return { ok: true };
}
