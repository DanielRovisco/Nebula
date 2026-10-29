import { NextResponse, type NextRequest } from "next/server";
import { parseFilters } from "@/lib/filters";
import { searchMapPoints } from "@/server/search";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`map:${clientIp(req.headers)}`, 180, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const sp = req.nextUrl.searchParams;
  const business = sp.get("business") === "rent" ? "rent" : "sale";
  try {
    const result = await searchMapPoints(parseFilters(business, sp));
    return NextResponse.json(result, { headers: { "cache-control": "private, max-age=15" } });
  } catch (e) {
    console.error("[api/search/map]", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
