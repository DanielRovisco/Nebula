import { NextResponse, type NextRequest } from "next/server";
import { interpretQuery } from "@/server/nl-search";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`nl:${clientIp(req.headers)}`, 60, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ error: "too_short" }, { status: 400 });
  try {
    return NextResponse.json(await interpretQuery(q));
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
