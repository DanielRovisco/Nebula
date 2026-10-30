import { sql } from "@/db";

export type Plan = "free" | "pro" | "agency";
export type Feature = "alerts" | "valuations" | "exports" | "fsbo" | "pdf_reports" | "crm" | "api_calls" | "seats";

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, agency: 2 };
const best = (a: Plan, b: Plan): Plan => (PLAN_RANK[a] >= PLAN_RANK[b] ? a : b);

export interface Entitlement {
  enabled: boolean;
  /** null = unlimited */
  limit: number | null;
}

export const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);

/** Highest plan among the user's own active subscription and the plans of the organisations they belong to. */
export async function effectivePlan(userId: string): Promise<{ plan: Plan; trialEndsAt: Date | null; source: "user" | "org" | "free"; orgId: string | null }> {
  const own = await sql<{ plan: Plan; status: string; trial_ends_at: Date | null }[]>`
    SELECT plan, status, trial_ends_at FROM subscriptions
    WHERE user_id = ${userId} AND status IN ('trialing', 'active', 'past_due') ORDER BY created_at DESC`;
  const orgs = await sql<{ id: string; plan: Plan }[]>`
    SELECT o.id, o.plan FROM memberships m JOIN organizations o ON o.id = m.organization_id WHERE m.user_id = ${userId} AND o.deleted_at IS NULL`;
  let plan: Plan = "free";
  let source: "user" | "org" | "free" = "free";
  let trial: Date | null = null;
  let orgId: string | null = null;
  for (const s of own) {
    if (PLAN_RANK[s.plan] > PLAN_RANK[plan]) {
      plan = s.plan;
      source = "user";
      trial = s.status === "trialing" ? s.trial_ends_at : null;
    }
  }
  for (const o of orgs) {
    const next = best(plan, o.plan);
    if (next !== plan) {
      plan = next;
      source = "org";
      orgId = o.id;
    }
  }
  return { plan, trialEndsAt: trial, source, orgId };
}

export async function getEntitlement(plan: Plan, feature: Feature): Promise<Entitlement> {
  const [r] = await sql<{ enabled: boolean; limit_value: number | null }[]>`
    SELECT enabled, limit_value FROM entitlements WHERE plan = ${plan} AND feature = ${feature}`;
  return r ? { enabled: r.enabled, limit: r.limit_value } : { enabled: false, limit: 0 };
}

export async function getUsage(scopeType: "user" | "org" | "key", scopeId: string, feature: string, period = monthStart()): Promise<number> {
  const [r] = await sql<{ count: number }[]>`
    SELECT count FROM usage_counters WHERE scope_type = ${scopeType} AND scope_id = ${scopeId} AND feature = ${feature} AND period = ${period}::date`;
  return r?.count ?? 0;
}

export async function incrementUsage(scopeType: "user" | "org" | "key", scopeId: string, feature: string, by = 1): Promise<number> {
  const [r] = await sql<{ count: number }[]>`
    INSERT INTO usage_counters (scope_type, scope_id, feature, period, count) VALUES (${scopeType}, ${scopeId}, ${feature}, ${monthStart()}::date, ${by})
    ON CONFLICT (scope_type, scope_id, feature, period) DO UPDATE SET count = usage_counters.count + ${by}, updated_at = now()
    RETURNING count`;
  return r!.count;
}

export interface QuotaCheck {
  allowed: boolean;
  plan: Plan;
  limit: number | null;
  used: number;
  reason?: "plan" | "quota";
}

/** Checks a monthly-metered feature without consuming it. */
export async function checkQuota(userId: string, feature: Feature, opts: { scope?: { type: "user" | "org"; id: string }; plan?: Plan } = {}): Promise<QuotaCheck> {
  const plan = opts.plan ?? (await effectivePlan(userId)).plan;
  const e = await getEntitlement(plan, feature);
  if (!e.enabled) return { allowed: false, plan, limit: e.limit, used: 0, reason: "plan" };
  const scope = opts.scope ?? { type: "user" as const, id: userId };
  const used = await getUsage(scope.type, scope.id, feature);
  if (e.limit != null && used >= e.limit) return { allowed: false, plan, limit: e.limit, used, reason: "quota" };
  return { allowed: true, plan, limit: e.limit, used };
}

/** Counts rows instead of a monthly counter (e.g. number of active alerts). */
export async function checkCapacity(userId: string, feature: Feature, current: number): Promise<QuotaCheck> {
  const { plan } = await effectivePlan(userId);
  const e = await getEntitlement(plan, feature);
  if (!e.enabled) return { allowed: false, plan, limit: e.limit, used: current, reason: "plan" };
  if (e.limit != null && current >= e.limit) return { allowed: false, plan, limit: e.limit, used: current, reason: "quota" };
  return { allowed: true, plan, limit: e.limit, used: current };
}
