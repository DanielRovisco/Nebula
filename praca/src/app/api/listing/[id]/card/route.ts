import { NextResponse, type NextRequest } from "next/server";
import { UUID_RE } from "@/lib/ids";
import { getResultById } from "@/server/search";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const item = await getResultById(id).catch(() => null);
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(item, { headers: { "cache-control": "private, max-age=60" } });
}
