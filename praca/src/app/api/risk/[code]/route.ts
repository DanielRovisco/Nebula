import { NextResponse, type NextRequest } from "next/server";
import { parseBBox } from "@/lib/filters";
import { riskGeoJson } from "@/server/risk";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const rl = await rateLimit(`risk:${clientIp(req.headers)}`, 120, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const { code } = await params;
  const b = parseBBox(req.nextUrl.searchParams.get("bbox") ?? undefined);
  if (!/^[a-z_]{2,20}$/.test(code) || !b) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return NextResponse.json(await riskGeoJson(code, [b.w, b.s, b.e, b.n]), { headers: { "cache-control": "public, max-age=300" } });
}
