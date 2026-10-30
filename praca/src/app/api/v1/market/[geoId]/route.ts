import type { NextResponse} from "next/server";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, authenticate, errorResponse, ok } from "@/server/api/auth";
import { getKpi, getSeries, resolveCodes } from "@/server/observatory";

export const dynamic = "force-dynamic";

/** GET /api/v1/market/{geoId} — geoId: PT, a 2-digit district, 4-digit municipality or 6-digit parish code. ?months=1–60 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ geoId: string }> }): Promise<NextResponse> {
  try {
    const ctx = await authenticate(req);
    const { geoId } = await params;
    const months = z.coerce.number().int().min(1).max(60).default(24).safeParse(req.nextUrl.searchParams.get("months") ?? undefined);
    if (!months.success) throw new ApiError(400, "invalid_parameter", "months deve estar entre 1 e 60.");
    const [zone] = await resolveCodes([geoId.toUpperCase()]);
    if (!zone) throw new ApiError(404, "not_found", "Território não encontrado.");
    const [sale, rent, saleSeries, rentSeries] = await Promise.all([getKpi(zone.level, zone.code, "sale"), getKpi(zone.level, zone.code, "rent"), getSeries(zone.level, zone.code, "sale", months.data), getSeries(zone.level, zone.code, "rent", months.data)]);
    const kpi = (k: Awaited<ReturnType<typeof getKpi>>) => k && { medianPricePerM2: k.ppm, p25: k.p25, p75: k.p75, medianPrice: k.medianPrice, sample: k.n, yoyChange: k.yoy, qoqChange: k.qoq, grossYield: k.grossYield, medianDaysOnMarket: k.dom, avgAskingDiscount: k.discount, aggregatedFrom: k.aggregatedFrom, period: k.period, isDemo: k.isSeed };
    return ok({ geo: { id: zone.code, level: zone.level, name: zone.name }, sale: kpi(sale), rent: kpi(rent), series: { sale: saleSeries, rent: rentSeries }, source: "Anúncios recebidos pela Praça. Preços pedidos, não preços de transação.", methodology: "/metodologia" }, undefined, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}
