import { sql } from "@/db";
import { runValuation, valuationInput, type ValuationOutcome } from "./avm";

export interface ValuationRecord {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  organizationId: string | null;
  outcome: ValuationOutcome;
  agent: { name: string | null; email: string; amiNumber: string | null; amiStatus: string } | null;
  brand: { name: string; logoUrl: string | null; color: string | null; email: string | null; phone: string | null; website: string | null } | null;
}

type Row = {
  id: string; title: string | null; created_at: Date; updated_at: Date; user_id: string | null; organization_id: string | null; result: ValuationOutcome;
  uname: string | null; uemail: string | null; ami: string | null; ami_status: string | null;
  oname: string | null; logo: string | null; color: string | null; oemail: string | null; ophone: string | null; web: string | null;
};

const base = sql`
  SELECT v.id, v.title, v.created_at, v.updated_at, v.user_id, v.organization_id, v.result,
         u.name AS uname, u.email AS uemail, u.ami_number AS ami, u.ami_status::text AS ami_status,
         o.name AS oname, o.logo_url AS logo, o.brand_color AS color, o.email AS oemail, o.phone AS ophone, o.website AS web
  FROM valuations v LEFT JOIN users u ON u.id = v.user_id LEFT JOIN organizations o ON o.id = v.organization_id`;

const map = (r: Row): ValuationRecord => ({
  id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at, userId: r.user_id, organizationId: r.organization_id, outcome: r.result,
  agent: r.uemail ? { name: r.uname, email: r.uemail, amiNumber: r.ami, amiStatus: r.ami_status ?? "none" } : null,
  brand: r.oname ? { name: r.oname, logoUrl: r.logo, color: r.color, email: r.oemail, phone: r.ophone, website: r.web } : null,
});

/** Owner or organisation member. */
export async function getValuationForUser(id: string, userId: string): Promise<ValuationRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql<Row[]>`${base} WHERE v.id = ${id} AND (v.user_id = ${userId} OR v.organization_id IN (SELECT organization_id FROM memberships WHERE user_id = ${userId}))`;
  return r ? map(r) : null;
}

export async function refreshValuation(id: string): Promise<boolean> {
  const [v] = await sql<{ input: unknown }[]>`SELECT input FROM valuations WHERE id = ${id}`;
  const parsed = valuationInput.safeParse(v?.input);
  if (!parsed.success) return false;
  const outcome = await runValuation(parsed.data);
  if (!outcome.sale) return false;
  await sql`UPDATE valuations SET estimate = ${outcome.sale.value}, low = ${outcome.sale.low}, high = ${outcome.sale.high}, confidence = ${outcome.sale.confidence}, result = ${sql.json(outcome as never)}, updated_at = now() WHERE id = ${id}`;
  return true;
}

/** Public SmartLink: lazily refreshed when older than 24 h so the shared page stays current. */
export async function getValuationBySlug(slug: string): Promise<ValuationRecord | null> {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(slug)) return null;
  const [l] = await sql<{ valuation_id: string; refresh_daily: boolean; expires_at: Date | null }[]>`SELECT valuation_id, refresh_daily, expires_at FROM smartlinks WHERE slug = ${slug}`;
  if (!l || (l.expires_at && l.expires_at < new Date())) return null;
  let [r] = await sql<Row[]>`${base} WHERE v.id = ${l.valuation_id}`;
  if (!r) return null;
  if (l.refresh_daily && Date.now() - r.updated_at.getTime() > 24 * 3600_000 && (await refreshValuation(r.id))) [r] = await sql<Row[]>`${base} WHERE v.id = ${l.valuation_id}`;
  return r ? map(r) : null;
}

export async function listValuations(userId: string, limit = 50) {
  return sql<{ id: string; title: string | null; estimate: number | null; low: number | null; high: number | null; confidence: number | null; created_at: Date; slug: string | null }[]>`
    SELECT v.id, v.title, v.estimate::float8, v.low::float8, v.high::float8, v.confidence::float8, v.created_at,
           (SELECT slug FROM smartlinks s WHERE s.valuation_id = v.id ORDER BY created_at DESC LIMIT 1) AS slug
    FROM valuations v WHERE v.user_id = ${userId} OR v.organization_id IN (SELECT organization_id FROM memberships WHERE user_id = ${userId})
    ORDER BY v.created_at DESC LIMIT ${limit}`;
}
