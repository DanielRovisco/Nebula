import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/server/geo";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`suggest:${clientIp(req.headers)}`, 120, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const items = await suggest(q);
    return NextResponse.json({ items }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
