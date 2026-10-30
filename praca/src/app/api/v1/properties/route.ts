import type { NextResponse} from "next/server";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { parseFilters } from "@/lib/filters";
import { ApiError, authenticate, errorResponse, ok } from "@/server/api/auth";
import { propertySummary } from "@/server/api/serialize";
import { searchListings } from "@/server/search";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/properties — same filters as the website's query string (tipo, t, pmin, pmax, amin, quartos, elevador, estado,
 * anunciante, zonas, bbox, q, ordem…) plus business, d/m/f geography codes, limit (1–50) and cursor.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const ctx = await authenticate(req);
    const sp = req.nextUrl.searchParams;
    const q = z.object({ business: z.enum(["sale", "rent"]).default("sale"), limit: z.coerce.number().int().min(1).max(50).default(20) }).safeParse({ business: sp.get("business") ?? undefined, limit: sp.get("limit") ?? undefined });
    if (!q.success) throw new ApiError(400, "invalid_parameter", "Parâmetros inválidos.", q.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
    const filters = parseFilters(q.data.business, sp);
    filters.cursor = sp.get("cursor") ?? filters.cursor; // the API calls it "cursor"; the website's query string uses "c"
    const r = await searchListings(filters, q.data.limit);
    return ok(r.items.map(propertySummary), { total: r.total, nextCursor: r.nextCursor, limit: q.data.limit }, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}
