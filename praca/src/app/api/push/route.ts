import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pushConfigured, pushCount, removePushSubscription, savePushSubscription } from "@/server/notify";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

const sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "push_unavailable" }, { status: 503 });
  const p = sub.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    await savePushSubscription(u.id, p.data, req.headers.get("user-agent")?.slice(0, 200) ?? null);
  } catch {
    return NextResponse.json({ error: "invalid_endpoint" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, devices: await pushCount(u.id) });
}

export async function DELETE(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = z.object({ endpoint: z.string().max(1000) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  await removePushSubscription(u.id, p.data.endpoint);
  return NextResponse.json({ ok: true });
}
