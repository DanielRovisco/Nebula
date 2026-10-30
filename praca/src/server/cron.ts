import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Cron endpoints accept `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it automatically).
 * Without CRON_SECRET they only run outside production, so a forgotten variable never exposes them.
 */
export function cronGuard(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NEXT_PUBLIC_APP_ENV === "production") return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
    return null;
  }
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
