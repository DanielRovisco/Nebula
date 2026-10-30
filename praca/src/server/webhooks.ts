import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { sql } from "@/db";

import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/crm-constants";
export { WEBHOOK_EVENTS, type WebhookEvent };

export const newSecret = () => `whsec_${randomBytes(24).toString("base64url")}`;

/** HMAC-SHA256 over `${timestamp}.${body}`, like Stripe: receivers verify and reject stale timestamps. */
export function sign(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

const privateV4 = (ip: string) => {
  const p = ip.split(".").map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1]! >= 16 && p[1]! <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1]! >= 64 && p[1]! <= 127);
};

export const isPrivateAddress = (ip: string): boolean => {
  if (isIP(ip) === 4) return privateV4(ip);
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  return mapped ? privateV4(mapped[1]!) : false;
};

/** SSRF guard: https only (http allowed outside production), and the host must not resolve to a private address. */
export async function assertSafeWebhookUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  const prod = process.env.NEXT_PUBLIC_APP_ENV === "production";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && !prod)) throw new Error("Only https URLs are allowed");
  if (u.username || u.password) throw new Error("Credentials in URLs are not allowed");
  if (!prod && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return u; // local development receivers
  const addrs = isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("URL resolves to a private address");
  return u;
}

type Hook = { id: string; url: string; secret: string };

/** Fire-and-forget delivery to every active webhook of the organisation subscribed to the event. */
export async function emitWebhook(organizationId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const hooks = await sql<Hook[]>`SELECT id, url, secret FROM webhooks WHERE organization_id = ${organizationId} AND active AND ${event} = ANY(events)`;
  await deliverAll(hooks, event, data);
}

/** Delivers one event to a single webhook (the "send test" button). */
export async function emitWebhookTo(webhookId: string, event: string, data: Record<string, unknown>): Promise<void> {
  const hooks = await sql<Hook[]>`SELECT id, url, secret FROM webhooks WHERE id = ${webhookId}`;
  await deliverAll(hooks, event, data);
}

async function deliverAll(hooks: Hook[], event: string, data: Record<string, unknown>): Promise<void> {
  const body = JSON.stringify({ id: crypto.randomUUID(), event, createdAt: new Date().toISOString(), data });
  await Promise.all(
    hooks.map(async (h) => {
      const started = Date.now();
      let status: number | null = null;
      let error: string | null = null;
      try {
        const url = await assertSafeWebhookUrl(h.url);
        const ts = Math.floor(Date.now() / 1000);
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-praca-event": event, "x-praca-timestamp": String(ts), "x-praca-signature": `sha256=${sign(h.secret, ts, body)}`, "user-agent": "Praca-Webhooks/1.0" },
          body,
          signal: AbortSignal.timeout(5000),
          redirect: "manual", // a redirect could point at an internal address
        });
        status = res.status;
        if (!res.ok) error = `HTTP ${res.status}`;
      } catch (e) {
        error = e instanceof Error ? e.message.slice(0, 200) : "error";
      }
      await sql`INSERT INTO webhook_deliveries (webhook_id, event, status_code, ok, duration_ms, error) VALUES (${h.id}, ${event}, ${status}, ${error === null}, ${Date.now() - started}, ${error})`.catch(() => {});
    }),
  );
}
