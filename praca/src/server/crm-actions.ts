"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { z } from "zod";
import { sql } from "@/db";
import { audit } from "./audit";
import { CONTACT_KINDS, STAGES } from "./crm";
import { guardOrg } from "./org-guard";
import { emitWebhook } from "./webhooks";

export type CrmError = "auth" | "plan" | "permission" | "invalid" | "not_found";
export interface CrmResult<T = unknown> {
  ok: boolean;
  error?: CrmError;
  data?: T;
}

const uuid = z.string().uuid();

const guard = (min: "viewer" | "agent" | "admin" = "agent") => guardOrg("crm", min);

const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.union([z.literal(""), z.email().max(200)]).optional(),
  phone: z.string().trim().max(40).optional(),
  kind: z.enum(CONTACT_KINDS).default("lead"),
  source: z.string().trim().max(120).optional(),
  legalBasis: z.string().trim().max(200).optional(),
  tags: z.string().trim().max(200).optional(),
});

export async function createContact(_p: CrmResult, form: FormData): Promise<CrmResult<{ id: string }>> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  const p = contactSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "invalid" };
  const d = p.data;
  const tags = (d.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  const [c] = await sql<{ id: string }[]>`
    INSERT INTO crm_contacts (organization_id, owner_id, name, email, phone, kind, source, legal_basis, tags)
    VALUES (${g.ctx.orgId}, ${g.ctx.user.id}, ${d.name}, ${d.email || null}, ${d.phone || null}, ${d.kind}, ${d.source || null}, ${d.legalBasis || null}, ${sql.array(tags)})
    RETURNING id`;
  await audit(g.ctx.user.id, g.ctx.orgId, "contact.created", "contact", c!.id);
  void emitWebhook(g.ctx.orgId, "contact.created", { id: c!.id, name: d.name, kind: d.kind });
  revalidatePath("/crm/contactos");
  return { ok: true, data: { id: c!.id } };
}

export async function deleteContact(id: string): Promise<CrmResult> {
  const g = await guard("agent");
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  await sql`UPDATE crm_contacts SET deleted_at = now() WHERE id = ${id} AND organization_id = ${g.ctx.orgId}`;
  await audit(g.ctx.user.id, g.ctx.orgId, "contact.deleted", "contact", id);
  revalidatePath("/crm/contactos");
  return { ok: true };
}

/** CSV import. Header names (pt or en) are mapped; invalid rows are reported, never silently dropped. */
export async function importContacts(_p: CrmResult, form: FormData): Promise<CrmResult<{ imported: number; skipped: number; errors: string[] }>> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 2_000_000) return { ok: false, error: "invalid" };
  const text = (await file.text()).replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  const pick = (row: Record<string, string>, keys: string[]) => keys.map((k) => row[k]).find((v) => v != null && v.trim() !== "")?.trim();
  let imported = 0;
  const errors: string[] = [];
  const rows = parsed.data.slice(0, 5000);
  for (const [i, row] of rows.entries()) {
    const name = pick(row, ["nome", "name"]);
    const email = pick(row, ["email", "e-mail"]);
    const kind = (pick(row, ["tipo", "kind"]) ?? "lead").toLowerCase();
    const c = contactSchema.safeParse({ name, email, phone: pick(row, ["telefone", "telemovel", "phone"]), kind: (CONTACT_KINDS as readonly string[]).includes(kind) ? kind : "lead", source: pick(row, ["origem", "source"]) ?? "Importação CSV", tags: pick(row, ["etiquetas", "tags"])?.replace(/\|/g, ",") });
    if (!c.success) {
      if (errors.length < 20) errors.push(`Linha ${i + 2}: dados inválidos`);
      continue;
    }
    const d = c.data;
    await sql`INSERT INTO crm_contacts (organization_id, owner_id, name, email, phone, kind, source, tags)
              VALUES (${g.ctx.orgId}, ${g.ctx.user.id}, ${d.name}, ${d.email || null}, ${d.phone || null}, ${d.kind}, ${d.source || null}, ${sql.array((d.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10))})`;
    imported++;
  }
  await audit(g.ctx.user.id, g.ctx.orgId, "contacts.imported", "contact", undefined, { imported, skipped: rows.length - imported });
  revalidatePath("/crm/contactos");
  return { ok: true, data: { imported, skipped: rows.length - imported, errors } };
}

const dealSchema = z.object({
  title: z.string().trim().min(2).max(160),
  contactId: z.union([z.literal(""), uuid]).optional(),
  propertyRef: z.string().trim().max(20).optional(),
  value: z.coerce.number().min(0).max(1e9).optional(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
});

export async function createDeal(_p: CrmResult, form: FormData): Promise<CrmResult<{ id: string }>> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  const raw = Object.fromEntries(form);
  const p = dealSchema.safeParse({ ...raw, value: raw.value === "" ? undefined : raw.value, commissionPct: raw.commissionPct === "" ? undefined : raw.commissionPct });
  if (!p.success) return { ok: false, error: "invalid" };
  const d = p.data;
  // Linked records must belong to the same organisation / exist.
  if (d.contactId) {
    const [ok] = await sql`SELECT 1 FROM crm_contacts WHERE id = ${d.contactId} AND organization_id = ${g.ctx.orgId} AND deleted_at IS NULL`;
    if (!ok) return { ok: false, error: "not_found" };
  }
  let propertyId: string | null = null;
  if (d.propertyRef) {
    const [pr] = await sql<{ id: string }[]>`SELECT id FROM properties WHERE reference = ${d.propertyRef.toUpperCase()} AND deleted_at IS NULL`;
    if (!pr) return { ok: false, error: "not_found" };
    propertyId = pr.id;
  }
  const [{ pos } = { pos: 0 }] = await sql<{ pos: number }[]>`SELECT coalesce(max(position), 0) + 1 AS pos FROM crm_deals WHERE organization_id = ${g.ctx.orgId} AND stage = 'new'`;
  const [deal] = await sql<{ id: string }[]>`
    INSERT INTO crm_deals (organization_id, title, contact_id, property_id, owner_id, value, commission_pct, stage, position)
    VALUES (${g.ctx.orgId}, ${d.title}, ${d.contactId || null}, ${propertyId}, ${g.ctx.user.id}, ${d.value ?? null}, ${d.commissionPct ?? null}, 'new', ${pos}) RETURNING id`;
  await audit(g.ctx.user.id, g.ctx.orgId, "deal.created", "deal", deal!.id, { title: d.title });
  void emitWebhook(g.ctx.orgId, "deal.created", { id: deal!.id, title: d.title });
  revalidatePath("/crm");
  return { ok: true, data: { id: deal!.id } };
}

export async function moveDeal(id: string, stage: string): Promise<CrmResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success || !(STAGES as readonly string[]).includes(stage)) return { ok: false, error: "invalid" };
  const [before] = await sql<{ stage: string }[]>`SELECT stage FROM crm_deals WHERE id = ${id} AND organization_id = ${g.ctx.orgId} AND deleted_at IS NULL`;
  if (!before) return { ok: false, error: "not_found" };
  if (before.stage === stage) return { ok: true };
  const [{ pos } = { pos: 0 }] = await sql<{ pos: number }[]>`SELECT coalesce(max(position), 0) + 1 AS pos FROM crm_deals WHERE organization_id = ${g.ctx.orgId} AND stage = ${stage}`;
  await sql`UPDATE crm_deals SET stage = ${stage}, position = ${pos}, updated_at = now() WHERE id = ${id} AND organization_id = ${g.ctx.orgId}`;
  await audit(g.ctx.user.id, g.ctx.orgId, "deal.stage_changed", "deal", id, { from: before.stage, to: stage });
  void emitWebhook(g.ctx.orgId, "deal.stage_changed", { id, from: before.stage, to: stage });
  revalidatePath("/crm");
  return { ok: true };
}

export async function addNote(dealId: string, body: string): Promise<CrmResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  const b = z.string().trim().min(1).max(4000).safeParse(body);
  if (!b.success || !uuid.safeParse(dealId).success) return { ok: false, error: "invalid" };
  const [d] = await sql`SELECT 1 FROM crm_deals WHERE id = ${dealId} AND organization_id = ${g.ctx.orgId}`;
  if (!d) return { ok: false, error: "not_found" };
  await sql`INSERT INTO crm_notes (organization_id, deal_id, author_id, body) VALUES (${g.ctx.orgId}, ${dealId}, ${g.ctx.user.id}, ${b.data})`;
  revalidatePath(`/crm/negocio/${dealId}`);
  return { ok: true };
}

export async function addTask(dealId: string | null, title: string, dueAt: string | null): Promise<CrmResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  const t = z.string().trim().min(1).max(200).safeParse(title);
  if (!t.success) return { ok: false, error: "invalid" };
  if (dealId) {
    if (!uuid.safeParse(dealId).success) return { ok: false, error: "invalid" };
    const [d] = await sql`SELECT 1 FROM crm_deals WHERE id = ${dealId} AND organization_id = ${g.ctx.orgId}`;
    if (!d) return { ok: false, error: "not_found" };
  }
  const due = dueAt && !Number.isNaN(Date.parse(dueAt)) ? new Date(dueAt) : null;
  await sql`INSERT INTO crm_tasks (organization_id, deal_id, assignee_id, title, due_at) VALUES (${g.ctx.orgId}, ${dealId}, ${g.ctx.user.id}, ${t.data}, ${due})`;
  revalidatePath("/crm/tarefas");
  if (dealId) revalidatePath(`/crm/negocio/${dealId}`);
  return { ok: true };
}

export async function toggleTask(id: string): Promise<CrmResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  await sql`UPDATE crm_tasks SET done_at = CASE WHEN done_at IS NULL THEN now() ELSE NULL END WHERE id = ${id} AND organization_id = ${g.ctx.orgId}`;
  revalidatePath("/crm/tarefas");
  return { ok: true };
}

export async function linkContactProperty(contactId: string, propertyRef: string, relation: "owner" | "interested" | "tenant"): Promise<CrmResult> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  if (!uuid.safeParse(contactId).success) return { ok: false, error: "invalid" };
  const [c] = await sql`SELECT 1 FROM crm_contacts WHERE id = ${contactId} AND organization_id = ${g.ctx.orgId}`;
  const [p] = await sql<{ id: string }[]>`SELECT id FROM properties WHERE reference = ${propertyRef.toUpperCase()}`;
  if (!c || !p) return { ok: false, error: "not_found" };
  await sql`INSERT INTO crm_contact_properties (organization_id, contact_id, property_id, relation) VALUES (${g.ctx.orgId}, ${contactId}, ${p.id}, ${relation}) ON CONFLICT (contact_id, property_id) DO UPDATE SET relation = ${relation}`;
  return { ok: true };
}
