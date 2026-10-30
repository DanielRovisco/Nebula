import type { NextResponse} from "next/server";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "@/db";
import { ApiError, authenticate, errorResponse, ok } from "@/server/api/auth";

export const dynamic = "force-dynamic";

const PHASES = ["planning", "licensing", "construction", "selling", "delivered"] as const;

/** GET /api/v1/developments — new-build projects. Filters: municipality (4-digit code), phase, limit (1–50), cursor (offset). */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const ctx = await authenticate(req);
    const sp = req.nextUrl.searchParams;
    const q = z.object({ municipality: z.string().regex(/^\d{4}$/).optional(), phase: z.enum(PHASES).optional(), limit: z.coerce.number().int().min(1).max(50).default(20), cursor: z.coerce.number().int().min(0).default(0) }).safeParse(Object.fromEntries(sp));
    if (!q.success) throw new ApiError(400, "invalid_parameter", "Parâmetros inválidos.", q.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
    const { municipality, phase, limit, cursor } = q.data;
    const rows = await sql<{ id: string; slug: string; name: string; developer: string; phase: string; municipality: string | null; municipality_code: string | null; lat: number | null; lng: number | null; total_units: number | null; available_units: number | null; expected_delivery: string | null; price_from: number | null; is_seed: boolean }[]>`
      SELECT d.id, d.slug, d.name, d.developer, d.phase, m.name AS municipality, d.municipality_code, d.lat::float8 AS lat, d.lng::float8 AS lng, d.total_units, d.available_units, d.expected_delivery::text, d.price_from::float8 AS price_from, d.is_seed
      FROM new_developments d LEFT JOIN geo_municipalities m ON m.code = d.municipality_code
      WHERE true ${municipality ? sql`AND d.municipality_code = ${municipality}` : sql``} ${phase ? sql`AND d.phase = ${phase}` : sql``}
      ORDER BY d.name LIMIT ${limit + 1} OFFSET ${cursor}`;
    const more = rows.length > limit;
    const page = more ? rows.slice(0, limit) : rows;
    return ok(page.map((r) => ({ id: r.id, slug: r.slug, name: r.name, developer: r.developer, phase: r.phase, municipality: r.municipality, municipalityCode: r.municipality_code, location: r.lat != null ? { lat: r.lat, lng: r.lng } : null, totalUnits: r.total_units, availableUnits: r.available_units, expectedDelivery: r.expected_delivery, priceFrom: r.price_from, isDemo: r.is_seed })), { limit, nextCursor: more ? String(cursor + limit) : null }, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}
