import { NextResponse, type NextRequest } from "next/server";
import { ISO_MINUTES, ISO_MODES, type IsoMode } from "@/lib/isochrone";
import { getIsochrone } from "@/server/isochrone";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(`iso:${clientIp(req.headers)}`, 20, 60);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const mode = sp.get("mode") as IsoMode;
  const minutes = Number(sp.get("minutes"));
  if (!(lat >= 29 && lat <= 43 && lng >= -35 && lng <= -5) || !ISO_MODES.includes(mode) || !(ISO_MINUTES as readonly number[]).includes(minutes)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const r = await getIsochrone(lat, lng, mode, minutes);
  return NextResponse.json({ provider: r.provider, geojson: r.geojson }, { headers: { "cache-control": "public, max-age=3600" } });
}
