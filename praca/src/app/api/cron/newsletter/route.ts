import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/server/cron";
import { sendDigest } from "@/server/newsletter";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Sends articles published since the last issue. Idempotent: an article is never sent twice. */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  return NextResponse.json(await sendDigest());
}
