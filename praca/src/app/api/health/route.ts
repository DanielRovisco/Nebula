import { NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

/** Liveness + readiness: also checks that the database answers and PostGIS is installed. */
export async function GET() {
  const started = Date.now();
  try {
    const [r] = await sql<{ postgis: string }[]>`SELECT postgis_version() AS postgis`;
    return NextResponse.json({ status: "ok", db: "up", postgis: r?.postgis?.split(" ")[0], ms: Date.now() - started });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down", ms: Date.now() - started }, { status: 503 });
  }
}
