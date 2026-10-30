import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "@/db";
import { parseFilters } from "@/lib/filters";
import { zonesToMultiPolygon } from "@/lib/zones";
import { ApiError, authenticate, errorResponse } from "@/server/api/auth";
import { checkCapacity } from "@/server/entitlements";

export const dynamic = "force-dynamic";

const body = z.object({
  name: z.string().trim().min(1).max(120),
  business: z.enum(["sale", "rent"]).default("sale"),
  /** Same query string as the website, e.g. "tipo=apartment&t=2&pmax=300000&m=1111". */
  filters: z.string().max(6000),
  frequency: z.enum(["instant", "daily", "weekly"]).default("daily"),
  triggers: z.array(z.enum(["new_listing", "price_drop", "back_on_market", "sold_or_withdrawn"])).min(1).default(["new_listing", "price_drop"]),
});

/** POST /api/v1/alerts — creates a saved search and its alert for the key owner. Emails go to the owner's address. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ctx = await authenticate(req);
    const p = body.safeParse(await req.json().catch(() => null));
    if (!p.success) throw new ApiError(400, "invalid_body", "Corpo inválido.", p.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
    const d = p.data;
    const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM alerts WHERE user_id = ${ctx.userId} AND active`;
    const cap = await checkCapacity(ctx.userId, "alerts", n);
    if (!cap.allowed) throw new ApiError(403, cap.reason === "plan" ? "plan_required" : "quota_exceeded", "Atingiu o limite de alertas do plano.");
    const f = parseFilters(d.business, new URLSearchParams(d.filters));
    const qs = new URLSearchParams(d.filters);
    qs.delete("c");
    const areas = f.zones.length ? JSON.stringify(zonesToMultiPolygon(f.zones)) : null;
    const [s] = await sql<{ id: string }[]>`
      INSERT INTO saved_searches (user_id, name, filters, areas) VALUES (${ctx.userId}, ${d.name}, ${sql.json({ business: d.business, qs: qs.toString(), geoSlugs: {} })}, ${areas ? sql`ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${areas}), 4326)))` : null}) RETURNING id`;
    const [a] = await sql<{ id: string }[]>`INSERT INTO alerts (saved_search_id, user_id, frequency, triggers, unsubscribe_token) VALUES (${s!.id}, ${ctx.userId}, ${d.frequency}, ${sql.array(d.triggers)}::alert_trigger[], ${randomBytes(18).toString("base64url")}) RETURNING id`;
    return NextResponse.json({ data: { id: a!.id, savedSearchId: s!.id, frequency: d.frequency, triggers: d.triggers } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
