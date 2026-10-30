import type { NextResponse} from "next/server";
import { type NextRequest } from "next/server";
import { ApiError, authenticate, errorResponse, ok } from "@/server/api/auth";
import { runValuation, valuationInput } from "@/server/avm";
import { checkQuota, effectivePlan, incrementUsage } from "@/server/entitlements";

export const dynamic = "force-dynamic";

/** POST /api/v1/valuations — body: { lat, lng, type, typology?, area, yearBuilt?, condition?, floor?, elevator? }. Counts against the monthly valuations quota. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ctx = await authenticate(req);
    const body = await req.json().catch(() => null);
    const p = valuationInput.safeParse(body);
    if (!p.success) throw new ApiError(400, "invalid_body", "Corpo inválido.", p.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
    const plan = await effectivePlan(ctx.userId);
    const scope = plan.source === "org" && plan.orgId ? { type: "org" as const, id: plan.orgId } : { type: "user" as const, id: ctx.userId };
    const q = await checkQuota(ctx.userId, "valuations", { scope, plan: plan.plan });
    if (!q.allowed) throw new ApiError(q.reason === "plan" ? 403 : 429, q.reason === "plan" ? "plan_required" : "quota_exceeded", q.reason === "plan" ? "O seu plano não inclui avaliações." : `Atingiu o limite mensal de ${q.limit} avaliações.`);
    const outcome = await runValuation(p.data);
    if (!outcome.sale) throw new ApiError(422, "insufficient_comparables", "Não há comparáveis suficientes perto deste ponto para avaliar.");
    await incrementUsage(scope.type, scope.id, "valuations");
    return ok({ estimate: outcome.sale, rent: outcome.rent, grossYield: outcome.grossYield, radiusM: outcome.radiusM, computedAt: outcome.computedAt, method: outcome.method }, undefined, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}
