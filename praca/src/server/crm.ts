import { sql } from "@/db";

/**
 * CRM data layer. EVERY function takes the organisation id and filters by it: that is the tenant boundary
 * (there is no RLS because the app connects as one database role). Callers resolve the org from the session.
 */
export const STAGES = ["new", "contacted", "visit", "proposal", "closing"] as const;
export type Stage = (typeof STAGES)[number];
export const CONTACT_KINDS = ["lead", "buyer", "seller", "landlord", "tenant", "investor", "fsbo"] as const;

export interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  kind: string;
  source: string | null;
  legalBasis: string | null;
  tags: string[];
  ownerName: string | null;
  createdAt: Date;
}

export async function listContacts(orgId: string, opts: { q?: string; kind?: string; limit?: number; offset?: number } = {}) {
  const q = opts.q?.trim();
  const like = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const rows = await sql<{ id: string; name: string; email: string | null; phone: string | null; kind: string; source: string | null; legal_basis: string | null; tags: string[]; owner: string | null; created_at: Date }[]>`
    SELECT c.id, c.name, c.email, c.phone, c.kind, c.source, c.legal_basis, c.tags, u.name AS owner, c.created_at
    FROM crm_contacts c LEFT JOIN users u ON u.id = c.owner_id
    WHERE c.organization_id = ${orgId} AND c.deleted_at IS NULL
      ${opts.kind ? sql`AND c.kind = ${opts.kind}` : sql``}
      ${like ? sql`AND (c.name ILIKE ${like} OR c.email ILIKE ${like} OR c.phone ILIKE ${like})` : sql``}
    ORDER BY c.created_at DESC LIMIT ${opts.limit ?? 100} OFFSET ${opts.offset ?? 0}`;
  return rows.map((r): ContactRow => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, kind: r.kind, source: r.source, legalBasis: r.legal_basis, tags: r.tags, ownerName: r.owner, createdAt: r.created_at }));
}

export interface DealRow {
  id: string;
  title: string | null;
  stage: Stage;
  value: number | null;
  commissionPct: number | null;
  contactId: string | null;
  contactName: string | null;
  propertyRef: string | null;
  propertyTitle: string | null;
  ownerName: string | null;
  position: number;
}

export async function listDeals(orgId: string): Promise<DealRow[]> {
  const rows = await sql<{ id: string; title: string | null; stage: Stage; value: number | null; commission_pct: number | null; contact_id: string | null; contact_name: string | null; ref: string | null; ptitle: string | null; owner: string | null; position: number }[]>`
    SELECT d.id, d.title, d.stage, d.value::float8 AS value, d.commission_pct::float8 AS commission_pct, d.contact_id, c.name AS contact_name, p.reference AS ref,
           (SELECT l.title FROM listings l WHERE l.property_id = p.id ORDER BY l.is_primary DESC LIMIT 1) AS ptitle, u.name AS owner, d.position
    FROM crm_deals d LEFT JOIN crm_contacts c ON c.id = d.contact_id AND c.organization_id = d.organization_id
    LEFT JOIN properties p ON p.id = d.property_id LEFT JOIN users u ON u.id = d.owner_id
    WHERE d.organization_id = ${orgId} AND d.deleted_at IS NULL ORDER BY d.position, d.created_at`;
  return rows.map((r) => ({ id: r.id, title: r.title, stage: r.stage, value: r.value, commissionPct: r.commission_pct, contactId: r.contact_id, contactName: r.contact_name, propertyRef: r.ref, propertyTitle: r.ptitle, ownerName: r.owner, position: r.position }));
}

export async function getDeal(orgId: string, id: string) {
  const [d] = await sql<{ id: string; title: string | null; stage: Stage; value: number | null; commission_pct: number | null; contact_id: string | null; property_id: string | null; ref: string | null; created_at: Date }[]>`
    SELECT d.id, d.title, d.stage, d.value::float8 AS value, d.commission_pct::float8 AS commission_pct, d.contact_id, d.property_id, p.reference AS ref, d.created_at
    FROM crm_deals d LEFT JOIN properties p ON p.id = d.property_id WHERE d.organization_id = ${orgId} AND d.id = ${id} AND d.deleted_at IS NULL`;
  if (!d) return null;
  const [contact] = d.contact_id ? await sql<{ id: string; name: string; email: string | null; phone: string | null }[]>`SELECT id, name, email, phone FROM crm_contacts WHERE id = ${d.contact_id} AND organization_id = ${orgId}` : [];
  const notes = await sql<{ id: string; body: string; created_at: Date; author: string | null }[]>`
    SELECT n.id, n.body, n.created_at, u.name AS author FROM crm_notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.organization_id = ${orgId} AND n.deal_id = ${id} ORDER BY n.created_at DESC`;
  const tasks = await sql<{ id: string; title: string; due_at: Date | null; done_at: Date | null }[]>`
    SELECT id, title, due_at, done_at FROM crm_tasks WHERE organization_id = ${orgId} AND deal_id = ${id} ORDER BY done_at NULLS FIRST, due_at NULLS LAST`;
  const history = await sql<{ id: string; action: string; created_at: Date; name: string | null; meta: Record<string, unknown> | null }[]>`
    SELECT a.id, a.action, a.created_at, u.name, a.meta FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.organization_id = ${orgId} AND a.entity = 'deal' AND a.entity_id = ${id} ORDER BY a.created_at DESC LIMIT 30`;
  return { deal: d, contact: contact ?? null, notes, tasks, history };
}

export async function listTasks(orgId: string, opts: { open?: boolean } = {}) {
  return sql<{ id: string; title: string; due_at: Date | null; done_at: Date | null; deal_id: string | null; deal_title: string | null; contact_name: string | null; assignee: string | null }[]>`
    SELECT t.id, t.title, t.due_at, t.done_at, t.deal_id, d.title AS deal_title, c.name AS contact_name, u.name AS assignee
    FROM crm_tasks t LEFT JOIN crm_deals d ON d.id = t.deal_id LEFT JOIN crm_contacts c ON c.id = t.contact_id LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.organization_id = ${orgId} ${opts.open ? sql`AND t.done_at IS NULL` : sql``}
    ORDER BY t.done_at NULLS FIRST, t.due_at NULLS LAST, t.created_at DESC LIMIT 200`;
}

export const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start) as well as quoting.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function exportContactsCsv(orgId: string): Promise<string> {
  const rows = await listContacts(orgId, { limit: 50000 });
  return ["nome,email,telefone,tipo,origem,base_legal,etiquetas,criado_em", ...rows.map((r) => [r.name, r.email, r.phone, r.kind, r.source, r.legalBasis, r.tags.join("|"), r.createdAt.toISOString()].map(csvCell).join(","))].join("\n");
}

export async function exportDealsCsv(orgId: string): Promise<string> {
  const rows = await listDeals(orgId);
  return ["titulo,fase,valor,comissao_pct,contacto,imovel", ...rows.map((r) => [r.title, r.stage, r.value, r.commissionPct, r.contactName, r.propertyRef].map(csvCell).join(","))].join("\n");
}
