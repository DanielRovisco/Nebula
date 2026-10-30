"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/db";
import { audit } from "./audit";
import { guardOrg } from "./org-guard";
import { emitWebhook } from "./webhooks";

import { PROSPECT_STATUS } from "@/lib/crm-constants";
export interface ProspectResult {
  ok: boolean;
  error?: "auth" | "plan" | "permission" | "invalid" | "not_found";
}

const uuid = z.string().uuid();

/**
 * Adds a private-owner listing to the organisation's prospecting pipeline: a prospect, a CRM contact (kind "fsbo",
 * with the legal basis recorded) and a deal in the first stage. Only data already public in the listing is copied.
 */
export async function addProspect(propertyId: string): Promise<ProspectResult> {
  const g = await guardOrg("fsbo", "agent");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const [l] = await sql<{ reference: string; title: string; price: number; contact_email: string | null; contact_phone: string | null }[]>`
    SELECT p.reference, l.title, l.price::float8 AS price, l.contact_email, l.contact_phone
    FROM listings l JOIN properties p ON p.id = l.property_id
    WHERE p.id = ${propertyId} AND l.advertiser_type = 'private' AND l.status = 'active' AND l.is_primary AND p.deleted_at IS NULL`;
  if (!l) return { ok: false, error: "not_found" };
  const [dup] = await sql`SELECT 1 FROM prospects WHERE organization_id = ${g.ctx.orgId} AND property_id = ${propertyId}`;
  if (dup) return { ok: true };

  const [c] = await sql<{ id: string }[]>`
    INSERT INTO crm_contacts (organization_id, owner_id, name, email, phone, kind, source, legal_basis, tags)
    VALUES (${g.ctx.orgId}, ${g.ctx.user.id}, ${`Proprietário · ${l.reference}`}, ${l.contact_email}, ${l.contact_phone}, 'fsbo', ${`Anúncio público ${l.reference}`}, 'Interesse legítimo (RGPD art. 6.º, n.º 1, al. f), com direito de oposição', ${sql.array(["fsbo"])}) RETURNING id`;
  const [d] = await sql<{ id: string }[]>`
    INSERT INTO crm_deals (organization_id, title, contact_id, property_id, owner_id, value, stage, position)
    VALUES (${g.ctx.orgId}, ${`Angariação ${l.reference}`}, ${c!.id}, ${propertyId}, ${g.ctx.user.id}, ${l.price}, 'new', 0) RETURNING id`;
  const [pr] = await sql<{ id: string }[]>`
    INSERT INTO prospects (organization_id, property_id, contact_id, deal_id, created_by) VALUES (${g.ctx.orgId}, ${propertyId}, ${c!.id}, ${d!.id}, ${g.ctx.user.id}) RETURNING id`;
  await audit(g.ctx.user.id, g.ctx.orgId, "prospect.created", "prospect", pr!.id, { reference: l.reference });
  void emitWebhook(g.ctx.orgId, "prospect.created", { id: pr!.id, reference: l.reference });
  revalidatePath("/crm/prospecao");
  return { ok: true };
}

export async function setProspectStatus(id: string, status: string, note?: string): Promise<ProspectResult> {
  const g = await guardOrg("fsbo", "agent");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success || !(PROSPECT_STATUS as readonly string[]).includes(status)) return { ok: false, error: "invalid" };
  const r = await sql`UPDATE prospects SET status = ${status}, note = ${note != null ? note.slice(0, 500) || null : sql`note`}, updated_at = now() WHERE id = ${id} AND organization_id = ${g.ctx.orgId} RETURNING id`;
  if (!r.length) return { ok: false, error: "not_found" };
  await audit(g.ctx.user.id, g.ctx.orgId, "prospect.status_changed", "prospect", id, { status });
  revalidatePath("/crm/prospecao");
  return { ok: true };
}
