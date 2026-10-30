import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/db";
import { cronGuard } from "@/server/cron";
import { runFeedSource } from "@/server/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Pulls every enabled feed source whose frequency has elapsed. Schedule it often (e.g. every 15 min); due-ness is decided here. */
export async function GET(req: NextRequest) {
  const denied = cronGuard(req);
  if (denied) return denied;
  const due = await sql<{ id: string; slug: string }[]>`
    SELECT id, slug FROM sources
    WHERE enabled AND endpoint IS NOT NULL AND frequency_minutes IS NOT NULL AND NOT is_seed
      AND (last_run_at IS NULL OR last_run_at < now() - make_interval(mins => frequency_minutes)) ORDER BY last_run_at NULLS FIRST LIMIT 10`;
  const out: { source: string; status: string; error?: string }[] = [];
  for (const s of due) {
    try {
      const r = await runFeedSource(s.id, null);
      out.push({ source: s.slug, status: r.status });
    } catch (e) {
      await sql`UPDATE sources SET last_run_at = now() WHERE id = ${s.id}`; // back off until the next window instead of hammering a broken feed
      out.push({ source: s.slug, status: "failed", error: e instanceof Error ? e.message : "erro" });
    }
  }
  return NextResponse.json({ ran: out.length, results: out });
}
