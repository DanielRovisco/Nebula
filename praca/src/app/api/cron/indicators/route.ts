import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { sql } from "@/db";
import { cronGuard } from "@/server/cron";
import { recomputeFraudSignals } from "@/server/fraud";
import { computeIndicators } from "@/server/indicators";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const r = await computeIndicators(sql);
  revalidateTag("market");
  // Fraud signals use the fresh zone medians.
  const fraud = await recomputeFraudSignals();
  return NextResponse.json({ ...r, fraud });
}
