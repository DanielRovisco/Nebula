import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { subscribe } from "@/server/newsletter";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const body = z.object({ email: z.string().max(200), locale: z.enum(["pt", "en"]).default("pt"), consent: z.literal(true) });

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`newsletter:${clientIp(req.headers)}`, 8, 3600);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    const r = await subscribe(p.data.email, p.data.locale);
    if (r === "invalid") return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
