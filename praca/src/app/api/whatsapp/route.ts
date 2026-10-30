import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requestWhatsAppCode, revokeWhatsApp, verifyWhatsAppCode, whatsappConfigured } from "@/server/notify";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

const body = z.discriminatedUnion("action", [z.object({ action: z.literal("request"), phone: z.string().max(30) }), z.object({ action: z.literal("verify"), code: z.string().regex(/^\d{6}$/) })]);

export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!whatsappConfigured()) return NextResponse.json({ error: "whatsapp_unavailable" }, { status: 503 });
  const rl = await rateLimit(`wa:${u.id}:${clientIp(req.headers)}`, 10, 3600);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (p.data.action === "request") {
    const r = await requestWhatsAppCode(u.id, p.data.phone);
    return NextResponse.json(r === "sent" ? { ok: true } : { error: r }, { status: r === "sent" ? 200 : r === "unavailable" ? 502 : r === "too_soon" ? 429 : 400 });
  }
  const r = await verifyWhatsAppCode(u.id, p.data.code);
  return NextResponse.json(r === "ok" ? { ok: true } : { error: r }, { status: r === "ok" ? 200 : 400 });
}

export async function DELETE() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await revokeWhatsApp(u.id);
  return NextResponse.json({ ok: true });
}
