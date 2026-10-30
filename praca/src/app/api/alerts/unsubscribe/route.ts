import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeByToken } from "@/server/saved-searches";

export const dynamic = "force-dynamic";

/** RFC 8058 one-click unsubscribe (mail clients POST here). */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const r = await unsubscribeByToken(token);
  return NextResponse.json(r, { status: r.ok ? 200 : 404 });
}
