import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

/** RGPD data portability: everything we hold about the signed-in user, as JSON. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = session.user.id;
  const [user] = await sql`SELECT id, name, email, image, phone, role, profile_type, ami_number, ami_status, locale, created_at FROM users WHERE id = ${id}`;
  const inquiries = await sql`SELECT i.id, i.listing_id, i.name, i.email, i.phone, i.message, i.created_at FROM inquiries i WHERE i.user_id = ${id} OR lower(i.email) = lower(${session.user.email ?? ""})`;
  const consents = await sql`SELECT purpose, granted, policy_version, created_at FROM consents WHERE user_id = ${id}`;
  const searches = await sql`SELECT name, filters, created_at FROM saved_searches WHERE user_id = ${id} AND deleted_at IS NULL`;
  const favorites = await sql`SELECT property_id, note, created_at FROM favorites WHERE user_id = ${id}`;
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), user, inquiries, consents, searches, favorites }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="praca-os-meus-dados.json"' },
  });
}
