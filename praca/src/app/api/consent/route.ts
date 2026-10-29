import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "@/db";
import { uuidv7 } from "@/lib/ids";

const body = z.object({
  purpose: z.enum(["cookies_analytics", "cookies_marketing", "newsletter"]),
  granted: z.boolean(),
  version: z.string().max(20),
});

/** Records a consent decision (RGPD proof of consent). Anonymous visitors are identified by a random first-party id. */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const jar = await cookies();
  let anon = jar.get("praca_anon")?.value;
  if (!anon) {
    anon = uuidv7();
    jar.set("praca_anon", anon, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 395, path: "/" });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(ip + (process.env.AUTH_SECRET ?? "")).digest("hex").slice(0, 32) : null;
  try {
    await sql`INSERT INTO consents (anonymous_id, purpose, granted, policy_version, ip_hash)
              VALUES (${anon}, ${parsed.data.purpose}, ${parsed.data.granted}, ${parsed.data.version}, ${ipHash})`;
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
  return NextResponse.json({ ok: true });
}
