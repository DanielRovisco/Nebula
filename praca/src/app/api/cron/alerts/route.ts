import { NextResponse, type NextRequest } from "next/server";
import { runAlertEngine, sendDigests } from "@/server/alerts";
import { cronGuard } from "@/server/cron";
import { sendChannelDigests } from "@/server/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** ?freq=instant|daily|weekly — the engine always runs (idempotent); only the digests of that frequency are sent. */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const freq = req.nextUrl.searchParams.get("freq");
  if (freq !== "instant" && freq !== "daily" && freq !== "weekly") return NextResponse.json({ error: "invalid_freq" }, { status: 400 });
  const engine = await runAlertEngine();
  const digests = await sendDigests(freq);
  const channels = await sendChannelDigests(freq);
  return NextResponse.json({ engine, digests, channels });
}
