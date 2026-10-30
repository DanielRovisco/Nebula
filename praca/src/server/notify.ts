import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { sql } from "@/db";
import { siteUrl } from "@/lib/env";
import { formatEur } from "@/lib/format";
import { toE164 } from "@/lib/phone";

/* ───────────────────────── Web Push ───────────────────────── */

export const pushConfigured = () => !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

function vapid() {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "ola@praca.example"}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(userId: string, sub: PushSub, userAgent: string | null) {
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) throw new Error("invalid_endpoint");
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) VALUES (${userId}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${userAgent})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint}`;
}

export async function pushCount(userId: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM push_subscriptions WHERE user_id = ${userId}`;
  return r?.n ?? 0;
}

/* ───────────────────────── WhatsApp (Meta Cloud API) ───────────────────────── */

export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ALERT_TEMPLATE && process.env.WHATSAPP_CODE_TEMPLATE);

type Fetch = typeof fetch;

/** Sends an approved template message. WhatsApp only allows business-initiated messages through templates. */
export async function sendWhatsAppTemplate(to: string, template: string, params: string[], doFetch: Fetch = fetch): Promise<boolean> {
  const res = await doFetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? "v21.0"}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "pt_PT" }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
    }),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}

const hashCode = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");

export async function requestWhatsAppCode(userId: string, phoneRaw: string, doFetch: Fetch = fetch): Promise<"sent" | "invalid_phone" | "unavailable" | "too_soon"> {
  const phone = toE164(phoneRaw);
  if (!phone) return "invalid_phone";
  if (!whatsappConfigured()) return "unavailable";
  const [prev] = await sql<{ created: string }[]>`SELECT code_expires_at::text AS created FROM whatsapp_optins WHERE user_id = ${userId} AND code_expires_at > now() + interval '9 minutes'`;
  if (prev) return "too_soon"; // one code per minute
  const code = String(randomInt(100000, 1000000));
  await sql`
    INSERT INTO whatsapp_optins (user_id, phone, code_hash, code_expires_at, attempts, verified_at, revoked_at) VALUES (${userId}, ${phone}, ${hashCode(userId, code)}, now() + interval '10 minutes', 0, NULL, NULL)
    ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone, code_hash = EXCLUDED.code_hash, code_expires_at = EXCLUDED.code_expires_at, attempts = 0, verified_at = NULL, revoked_at = NULL`;
  const ok = await sendWhatsAppTemplate(phone, process.env.WHATSAPP_CODE_TEMPLATE!, [code], doFetch);
  return ok ? "sent" : "unavailable";
}

export async function verifyWhatsAppCode(userId: string, code: string): Promise<"ok" | "wrong" | "expired" | "locked"> {
  const [r] = await sql<{ code_hash: string | null; expired: boolean; attempts: number }[]>`SELECT code_hash, code_expires_at < now() AS expired, attempts FROM whatsapp_optins WHERE user_id = ${userId} AND verified_at IS NULL`;
  if (!r?.code_hash) return "expired";
  if (r.attempts >= 5) return "locked";
  if (r.expired) return "expired";
  const a = Buffer.from(hashCode(userId, code.trim()));
  const b = Buffer.from(r.code_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await sql`UPDATE whatsapp_optins SET attempts = attempts + 1 WHERE user_id = ${userId}`;
    return "wrong";
  }
  await sql`UPDATE whatsapp_optins SET verified_at = now(), code_hash = NULL, code_expires_at = NULL WHERE user_id = ${userId}`;
  return "ok";
}

export async function revokeWhatsApp(userId: string) {
  await sql`UPDATE whatsapp_optins SET revoked_at = now(), verified_at = NULL WHERE user_id = ${userId}`;
}

export async function whatsappStatus(userId: string): Promise<{ phone: string; verified: boolean } | null> {
  const [r] = await sql<{ phone: string; verified_at: string | null }[]>`SELECT phone, verified_at FROM whatsapp_optins WHERE user_id = ${userId} AND revoked_at IS NULL`;
  return r ? { phone: r.phone.replace(/\d(?=\d{3})/g, "•"), verified: !!r.verified_at } : null;
}

/* ───────────────────────── Alert delivery over push and WhatsApp ───────────────────────── */

export interface ChannelResult {
  push: number;
  whatsapp: number;
}

type Queued = { alert_id: string; name: string; user_id: string; locale: string; n: number; first_ref: string; first_title: string; first_price: number; business: string; delivery_ids: string[] };

async function queuedFor(channel: "push" | "whatsapp", frequency: string): Promise<Queued[]> {
  return sql<Queued[]>`
    SELECT a.id AS alert_id, s.name, a.user_id, u.locale, count(*)::int AS n,
           (array_agg(p.reference ORDER BY e.occurred_at DESC))[1] AS first_ref,
           (array_agg(l.title ORDER BY e.occurred_at DESC))[1] AS first_title,
           (array_agg(l.price::float8 ORDER BY e.occurred_at DESC))[1] AS first_price,
           s.filters->>'business' AS business,
           array_agg(d.id::text) AS delivery_ids
    FROM alert_deliveries d JOIN alerts a ON a.id = d.alert_id JOIN saved_searches s ON s.id = a.saved_search_id JOIN users u ON u.id = a.user_id
    JOIN listings l ON l.id = d.listing_id JOIN properties p ON p.id = l.property_id JOIN listing_events e ON e.id = d.listing_event_id
    WHERE d.status = 'queued' AND d.channel = ${channel} AND a.active AND a.frequency = ${frequency} AND u.deleted_at IS NULL
    GROUP BY a.id, s.name, a.user_id, u.locale, s.filters`;
}

const mark = (ids: string[], status: "sent" | "failed") => sql`UPDATE alert_deliveries SET status = ${status}, sent_at = ${status === "sent" ? sql`now()` : null} WHERE id = ANY(${sql.array(ids)}::uuid[])`;

export async function sendChannelDigests(frequency: "instant" | "daily" | "weekly", doFetch: Fetch = fetch): Promise<ChannelResult> {
  const out: ChannelResult = { push: 0, whatsapp: 0 };

  if (pushConfigured()) {
    vapid();
    for (const q of await queuedFor("push", frequency)) {
      const subs = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${q.user_id}`;
      const en = q.locale === "en";
      const payload = JSON.stringify({
        title: en ? `${q.n} ${q.n === 1 ? "update" : "updates"}: ${q.name}` : `${q.n} ${q.n === 1 ? "novidade" : "novidades"}: ${q.name}`,
        body: `${q.first_title} · ${formatEur(q.first_price)}${q.business === "rent" ? (en ? "/month" : "/mês") : ""}`,
        url: `${siteUrl}${en ? "/en" : ""}/imovel/${q.first_ref.toLowerCase()}`,
        tag: `alert-${q.alert_id}`,
      });
      let delivered = false;
      for (const s of subs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
          delivered = true;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await sql`DELETE FROM push_subscriptions WHERE id = ${s.id}`; // subscription is gone
        }
      }
      await mark(q.delivery_ids, delivered ? "sent" : "failed");
      if (delivered) out.push++;
    }
  }

  if (whatsappConfigured()) {
    for (const q of await queuedFor("whatsapp", frequency)) {
      const [o] = await sql<{ phone: string }[]>`SELECT phone FROM whatsapp_optins WHERE user_id = ${q.user_id} AND verified_at IS NOT NULL AND revoked_at IS NULL`;
      if (!o) {
        await mark(q.delivery_ids, "failed");
        continue;
      }
      const link = `${siteUrl}${q.locale === "en" ? "/en" : ""}/imovel/${q.first_ref.toLowerCase()}`;
      let ok = false;
      try {
        ok = await sendWhatsAppTemplate(o.phone, process.env.WHATSAPP_ALERT_TEMPLATE!, [q.name, String(q.n), link], doFetch);
      } catch {
        ok = false;
      }
      await mark(q.delivery_ids, ok ? "sent" : "failed");
      if (ok) out.whatsapp++;
    }
  }
  return out;
}
