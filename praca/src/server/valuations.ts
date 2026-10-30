"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { sql } from "@/db";
import { runValuation, valuationInput } from "./avm";
import { checkQuota, effectivePlan, incrementUsage } from "./entitlements";
import { currentUser } from "./session";

export interface ValuationState {
  error?: "auth" | "plan" | "quota" | "invalid" | "none";
  limit?: number | null;
}

export async function createValuation(_prev: ValuationState, form: FormData): Promise<ValuationState> {
  const u = await currentUser();
  if (!u) return { error: "auth" };
  const raw = Object.fromEntries(form);
  const parsed = valuationInput.safeParse({
    ...raw,
    typology: raw.typology === "" ? undefined : raw.typology,
    yearBuilt: raw.yearBuilt === "" ? undefined : raw.yearBuilt,
    floor: raw.floor === "" ? undefined : raw.floor,
    condition: raw.condition === "" ? undefined : raw.condition,
    postalCode: raw.postalCode === "" ? undefined : raw.postalCode,
    cadastralRef: raw.cadastralRef === "" ? undefined : raw.cadastralRef,
    address: raw.address === "" ? undefined : raw.address,
    elevator: raw.elevator === "on",
  });
  if (!parsed.success) return { error: "invalid" };

  const plan = await effectivePlan(u.id);
  const scope = plan.source === "org" && plan.orgId ? { type: "org" as const, id: plan.orgId } : { type: "user" as const, id: u.id };
  const q = await checkQuota(u.id, "valuations", { scope, plan: plan.plan });
  if (!q.allowed) return { error: q.reason === "plan" ? "plan" : "quota", limit: q.limit };

  const outcome = await runValuation(parsed.data);
  if (!outcome.sale) return { error: "none" };
  const title = [parsed.data.address, parsed.data.type === "apartment" && parsed.data.typology != null ? `T${parsed.data.typology}` : null, `${parsed.data.area} m²`].filter(Boolean).join(" · ");
  const [v] = await sql<{ id: string }[]>`
    INSERT INTO valuations (user_id, organization_id, input, estimate, low, high, confidence, method, result, title)
    VALUES (${u.id}, ${plan.orgId}, ${sql.json(parsed.data)}, ${outcome.sale.value}, ${outcome.sale.low}, ${outcome.sale.high}, ${outcome.sale.confidence}, ${outcome.method}, ${sql.json(outcome as never)}, ${title})
    RETURNING id`;
  if (outcome.sale.comparables.length) {
    await sql`INSERT INTO valuation_comparables ${sql(
      outcome.sale.comparables.map((c) => ({ valuation_id: v!.id, listing_id: c.id, kind: c.kind, similarity: c.similarity, adjusted_price: c.adjustedPrice, adjustments: sql.json(c.adjustments) })),
    )}`;
  }
  await incrementUsage(scope.type, scope.id, "valuations");
  redirect(`/avaliar/${v!.id}`);
}

/** Owner or any member of the valuation's organisation may read/modify it. */
async function accessible(id: string, userId: string) {
  const [v] = await sql<{ id: string; organization_id: string | null }[]>`
    SELECT v.id, v.organization_id FROM valuations v
    WHERE v.id = ${id} AND (v.user_id = ${userId} OR v.organization_id IN (SELECT organization_id FROM memberships WHERE user_id = ${userId}))`;
  return v ?? null;
}

export async function createSmartLink(valuationId: string, refreshDaily = true): Promise<{ ok: boolean; slug?: string }> {
  const u = await currentUser();
  if (!u || !/^[0-9a-f-]{36}$/i.test(valuationId)) return { ok: false };
  const v = await accessible(valuationId, u.id);
  if (!v) return { ok: false };
  const [existing] = await sql<{ slug: string }[]>`SELECT slug FROM smartlinks WHERE valuation_id = ${valuationId} ORDER BY created_at DESC LIMIT 1`;
  if (existing) return { ok: true, slug: existing.slug };
  const slug = randomBytes(8).toString("base64url");
  await sql`INSERT INTO smartlinks (slug, valuation_id, organization_id, refresh_daily) VALUES (${slug}, ${valuationId}, ${v.organization_id}, ${refreshDaily})`;
  return { ok: true, slug };
}

export async function revokeSmartLink(valuationId: string): Promise<{ ok: boolean }> {
  const u = await currentUser();
  if (!u || !(await accessible(valuationId, u.id))) return { ok: false };
  await sql`DELETE FROM smartlinks WHERE valuation_id = ${valuationId}`;
  return { ok: true };
}
