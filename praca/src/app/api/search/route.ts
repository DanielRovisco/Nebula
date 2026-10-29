import { NextResponse, type NextRequest } from "next/server";
import { parseFilters } from "@/lib/filters";
import { searchListings } from "@/server/search";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`search:${clientIp(req.headers)}`, 240, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const sp = req.nextUrl.searchParams;
  const business = sp.get("business") === "rent" ? "rent" : "sale";
  const filters = parseFilters(business, sp);
  try {
    const limit = sp.get("count") === "1" ? 0 : undefined;
    const result = await searchListings(filters, limit);
    return NextResponse.json(limit === 0 ? { total: result.total } : result, { headers: { "cache-control": "private, max-age=15" } });
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
