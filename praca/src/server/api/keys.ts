"use server";

import { z } from "zod";
import { sql } from "@/db";
import { audit } from "@/server/audit";
import { effectivePlan, getEntitlement } from "@/server/entitlements";
import { currentUser } from "@/server/session";
import { generateKey } from "./auth";

export interface KeyResult {
  ok: boolean;
  error?: "auth" | "plan" | "invalid" | "limit";
  secret?: string;
}

/** Creates a key for the signed-in user (and their organisation, if the plan comes from it). The secret is returned once. */
export async function createApiKey(_p: KeyResult, form: FormData): Promise<KeyResult> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "auth" };
  const name = z.string().trim().min(2).max(60).safeParse(form.get("name"));
  if (!name.success) return { ok: false, error: "invalid" };
  const plan = await effectivePlan(u.id);
  const ent = await getEntitlement(plan.plan, "api_calls");
  if (!ent.enabled || ent.limit === 0) return { ok: false, error: "plan" };
  const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM api_keys WHERE user_id = ${u.id} AND revoked_at IS NULL`;
  if (n >= 10) return { ok: false, error: "limit" };
  const k = generateKey();
  const [row] = await sql<{ id: string }[]>`INSERT INTO api_keys (user_id, organization_id, name, prefix, key_hash, scopes) VALUES (${u.id}, ${plan.orgId}, ${name.data}, ${k.prefix}, ${k.hash}, ${sql.array(["read", "valuations"])}) RETURNING id`;
  await audit(u.id, plan.orgId, "api_key.created", "api_key", row!.id, { name: name.data });
  return { ok: true, secret: k.secret };
}

export async function revokeApiKey(id: string): Promise<{ ok: boolean }> {
  const u = await currentUser();
  if (!u || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  const r = await sql`UPDATE api_keys SET revoked_at = now() WHERE id = ${id} AND user_id = ${u.id} AND revoked_at IS NULL RETURNING id, organization_id`;
  if (r.length) await audit(u.id, (r[0] as { organization_id: string | null }).organization_id, "api_key.revoked", "api_key", id);
  return { ok: r.length > 0 };
}
