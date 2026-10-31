import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/server/cron";
import { syncOfficialSources } from "@/server/official-sources";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Weekly: INE publishes quarterly and the ECB monthly; a run with nothing new just rewrites the same rows. */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const r = await syncOfficialSources();
  revalidateTag("market");
  return NextResponse.json(r, { status: r.errors.length && !r.ine && !r.euribor ? 502 : 200 });
}
