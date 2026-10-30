import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/db";
import { effectivePlan, getEntitlement, getUsage, incrementUsage, type Plan } from "@/server/entitlements";
import { rateLimit } from "@/server/rate-limit";

export interface ApiKeyContext {
  keyId: string;
  userId: string;
  organizationId: string | null;
  plan: Plan;
  quota: { limit: number | null; used: number };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Uniform error body: { error: { code, message, details? } }. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) } }, { status: e.status, headers: e.headers });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: { code: "internal_error", message: "Erro interno. Tente novamente." } }, { status: 500 });
}

export const hashKey = (secret: string) => createHash("sha256").update(secret).digest("hex");

/** New secret: shown once, only its SHA-256 is stored. */
export function generateKey(): { secret: string; prefix: string; hash: string } {
  const secret = `prk_${randomBytes(28).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 12), hash: hashKey(secret) };
}

function extractKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key")?.trim() ?? null;
}

/**
 * Authenticates a request by API key, enforces the plan entitlement, a per-key rate limit (60/min)
 * and the monthly quota, and counts the call. Throws ApiError on any failure.
 */
export async function authenticate(req: NextRequest, opts: { count?: boolean } = {}): Promise<ApiKeyContext> {
  const secret = extractKey(req);
  if (!secret || !secret.startsWith("prk_")) throw new ApiError(401, "unauthorized", "Chave de API em falta. Envie «Authorization: Bearer prk_…».");
  const [k] = await sql<{ id: string; user_id: string | null; organization_id: string | null }[]>`
    SELECT id, user_id, organization_id FROM api_keys WHERE key_hash = ${hashKey(secret)} AND revoked_at IS NULL`;
  if (!k || !k.user_id) throw new ApiError(401, "unauthorized", "Chave de API inválida ou revogada.");

  const rl = await rateLimit(`apikey:${k.id}`, 60, 60);
  if (!rl.ok) throw new ApiError(429, "rate_limited", "Demasiados pedidos. Tente novamente em instantes.", undefined, { "retry-after": String(rl.retryAfter) });

  const plan = await effectivePlan(k.user_id);
  const ent = await getEntitlement(plan.plan, "api_calls");
  if (!ent.enabled || ent.limit === 0) throw new ApiError(403, "plan_required", "O seu plano não inclui acesso à API. Consulte /planos.");

  const scope = plan.source === "org" && plan.orgId ? ("org" as const) : ("user" as const);
  const scopeId = scope === "org" ? plan.orgId! : k.user_id;
  const used = await getUsage(scope, scopeId, "api_calls");
  if (ent.limit != null && used >= ent.limit) throw new ApiError(429, "quota_exceeded", `Atingiu o limite mensal de ${ent.limit} chamadas.`, { limit: ent.limit, used });
  if (opts.count !== false) {
    await incrementUsage(scope, scopeId, "api_calls");
    await sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${k.id}`;
  }
  return { keyId: k.id, userId: k.user_id, organizationId: k.organization_id, plan: plan.plan, quota: { limit: ent.limit, used: used + (opts.count !== false ? 1 : 0) } };
}

export function ok<T>(data: T, meta?: Record<string, unknown>, ctx?: ApiKeyContext) {
  const headers: Record<string, string> = { "cache-control": "private, no-store" };
  if (ctx?.quota.limit != null) {
    headers["x-quota-limit"] = String(ctx.quota.limit);
    headers["x-quota-remaining"] = String(Math.max(0, ctx.quota.limit - ctx.quota.used));
  }
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { headers });
}
