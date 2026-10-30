import { NextResponse } from "next/server";
import { sql } from "@/db";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ auth: false, ids: [] }, { headers: { "cache-control": "private, no-store" } });
  const rows = await sql<{ property_id: string }[]>`SELECT property_id FROM favorites WHERE user_id = ${u.id}`;
  return NextResponse.json({ auth: true, ids: rows.map((r) => r.property_id) }, { headers: { "cache-control": "private, no-store" } });
}
