"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/db";
import { ShareInviteEmail } from "@/emails/share-invite";
import { siteUrl } from "@/lib/env";
import { audit } from "./audit";
import { sendMail } from "./email";
import { guardOrg } from "./org-guard";

export interface ShareResult {
  ok: boolean;
  error?: "auth" | "plan" | "permission" | "invalid" | "not_found" | "self";
}

const uuid = z.string().uuid();
const input = z.object({ propertyRef: z.string().trim().regex(/^pr-\d{6}$/i), partnerEmail: z.email().max(200).transform((v) => v.toLowerCase()), splitPct: z.coerce.number().min(1).max(99) });

export async function createShare(_p: ShareResult, form: FormData): Promise<ShareResult> {
  const g = await guardOrg("crm", "agent");
  if ("error" in g) return { ok: false, error: g.error };
  const p = input.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "invalid" };
  const [l] = await sql<{ id: string; title: string }[]>`
    SELECT l.id, l.title FROM listings l JOIN properties p ON p.id = l.property_id WHERE p.reference = ${p.data.propertyRef.toUpperCase()} AND l.is_primary AND l.deleted_at IS NULL LIMIT 1`;
  if (!l) return { ok: false, error: "not_found" };
  // If the partner already belongs to an organisation, link it directly.
  const [partner] = await sql<{ organization_id: string }[]>`SELECT m.organization_id FROM memberships m JOIN users u ON u.id = m.user_id WHERE lower(u.email) = ${p.data.partnerEmail} ORDER BY m.created_at LIMIT 1`;
  if (partner?.organization_id === g.ctx.orgId) return { ok: false, error: "self" };
  const [s] = await sql<{ id: string }[]>`
    INSERT INTO commission_shares (listing_id, owner_org_id, partner_org_id, partner_email, split_pct, status)
    VALUES (${l.id}, ${g.ctx.orgId}, ${partner?.organization_id ?? null}, ${p.data.partnerEmail}, ${p.data.splitPct}, 'invited') RETURNING id`;
  await sendMail({ to: p.data.partnerEmail, subject: `${g.ctx.orgName} convidou-o para partilhar um imóvel`, react: createElement(ShareInviteEmail, { from: g.ctx.orgName, title: l.title, split: p.data.splitPct, url: `${siteUrl}/crm/partilhas` }), devHint: `Share invite → ${p.data.partnerEmail}` }).catch((e) => console.error("[share mail]", e));
  await audit(g.ctx.user.id, g.ctx.orgId, "share.created", "share", s!.id, { ref: p.data.propertyRef, split: p.data.splitPct });
  revalidatePath("/crm/partilhas");
  return { ok: true };
}

/** The invited party (by organisation, or by the invited email) accepts or declines. */
export async function respondShare(id: string, accept: boolean): Promise<ShareResult> {
  const g = await guardOrg("crm", "agent");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const r = await sql`
    UPDATE commission_shares SET status = ${accept ? "accepted" : "declined"}, partner_org_id = ${g.ctx.orgId}, updated_at = now()
    WHERE id = ${id} AND status = 'invited' AND owner_org_id <> ${g.ctx.orgId}
      AND (partner_org_id = ${g.ctx.orgId} OR lower(partner_email) = ${g.ctx.user.email.toLowerCase()}) RETURNING id`;
  if (!r.length) return { ok: false, error: "not_found" };
  await audit(g.ctx.user.id, g.ctx.orgId, accept ? "share.accepted" : "share.declined", "share", id);
  revalidatePath("/crm/partilhas");
  return { ok: true };
}

export async function closeShare(id: string): Promise<ShareResult> {
  const g = await guardOrg("crm", "agent");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const r = await sql`UPDATE commission_shares SET status = 'closed', updated_at = now() WHERE id = ${id} AND owner_org_id = ${g.ctx.orgId} AND status = 'accepted' RETURNING id`;
  if (!r.length) return { ok: false, error: "not_found" };
  await audit(g.ctx.user.id, g.ctx.orgId, "share.closed", "share", id);
  revalidatePath("/crm/partilhas");
  return { ok: true };
}

export async function cancelShare(id: string): Promise<ShareResult> {
  const g = await guardOrg("crm", "agent");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  const r = await sql`DELETE FROM commission_shares WHERE id = ${id} AND owner_org_id = ${g.ctx.orgId} AND status = 'invited' RETURNING id`;
  if (!r.length) return { ok: false, error: "not_found" };
  revalidatePath("/crm/partilhas");
  return { ok: true };
}
