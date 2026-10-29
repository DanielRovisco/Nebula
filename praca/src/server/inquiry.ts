"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { sql } from "@/db";
import { uuidv7 } from "@/lib/ids";
import { clientIp, rateLimit } from "@/server/rate-limit";

export interface InquiryState {
  status: "idle" | "ok" | "error";
  fieldErrors?: Partial<Record<"name" | "email" | "phone" | "message" | "consent", string>>;
}

const schema = z.object({
  listingId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s().-]{5,}$/)
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(5).max(2000),
  consent: z.literal("on"),
});

const CONSENT_VERSION = "2025-01";

async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured (dev/demo)
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return ((await res.json()) as { success: boolean }).success === true;
  } catch {
    return false;
  }
}

export async function submitInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  // Honeypot: real users never fill the hidden field. Pretend success so bots learn nothing.
  if (String(form.get("website") ?? "") !== "") return { status: "ok" };

  const h = await headers();
  const ip = clientIp(h);
  const rl = await rateLimit(`inquiry:${ip}`, 5, 600);
  if (!rl.ok) return { status: "error" };

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: NonNullable<InquiryState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (k === "name" || k === "email" || k === "phone" || k === "message" || k === "consent") fieldErrors[k] = "invalid";
    }
    return { status: "error", fieldErrors };
  }
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? "") || null, ip))) return { status: "error" };

  const d = parsed.data;
  const [exists] = await sql<{ id: string }[]>`SELECT id FROM listings WHERE id = ${d.listingId} AND deleted_at IS NULL`;
  if (!exists) return { status: "error" };

  await sql`INSERT INTO inquiries (id, listing_id, name, email, phone, message, consent_version)
            VALUES (${uuidv7()}, ${d.listingId}, ${d.name}, ${d.email}, ${d.phone || null}, ${d.message}, ${CONSENT_VERSION})`;
  await sql`INSERT INTO consents (purpose, granted, policy_version) VALUES ('contact_agent', true, ${CONSENT_VERSION})`;
  // Delivery to the advertiser (email/CRM webhook) is wired in phase 2; the record is the source of truth.
  return { status: "ok" };
}
