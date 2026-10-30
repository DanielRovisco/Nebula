import { createElement } from "react";
import { sql } from "@/db";
import { AlertDigestEmail, type DigestItem } from "@/emails/alert-digest";
import { siteUrl } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { formatEur } from "@/lib/format";
import { buildSearchHref } from "@/lib/search-url";
import { sendMail } from "./email";
import { buildConditions } from "./search";

export type Trigger = "new_listing" | "price_drop" | "back_on_market" | "sold_or_withdrawn";

/** listing_events.type → alert trigger. Events that no alert type cares about map to null. */
export function triggerFor(type: string): Trigger | null {
  switch (type) {
    case "published":
      return "new_listing";
    case "price_drop":
      return "price_drop";
    case "returned":
      return "back_on_market";
    case "sold":
    case "rented":
    case "withdrawn":
      return "sold_or_withdrawn";
    default:
      return null;
  }
}

interface EventRow {
  id: string;
  listing_id: string;
  type: string;
}

export interface EngineResult {
  events: number;
  alerts: number;
  queued: number;
}

type Frag = ReturnType<typeof buildConditions>[number];
const and = (parts: Frag[]): Frag => parts.reduce((a, b) => sql`${a} AND ${b}`);

/**
 * Matches unprocessed listing events against every active saved search and queues deliveries.
 * Idempotent: (alert, event, channel) is unique, and events are stamped processed_at at the end.
 */
export async function runAlertEngine(): Promise<EngineResult> {
  const events = await sql<EventRow[]>`
    SELECT id, listing_id, type FROM listing_events
    WHERE processed_at IS NULL AND occurred_at > now() - interval '30 days' ORDER BY occurred_at LIMIT 5000`;
  if (!events.length) return { events: 0, alerts: 0, queued: 0 };

  const byTrigger = new Map<Trigger, EventRow[]>();
  const irrelevant: string[] = [];
  for (const e of events) {
    const t = triggerFor(e.type);
    if (!t) irrelevant.push(e.id);
    else byTrigger.set(t, [...(byTrigger.get(t) ?? []), e]);
  }

  // Email always; push and WhatsApp only while the user has a registered device / a verified opt-in.
  const alerts = await sql<{ id: string; triggers: Trigger[]; filters: { business: "sale" | "rent"; qs: string }; has_push: boolean; has_wa: boolean }[]>`
    SELECT a.id, a.triggers, s.filters,
           EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = a.user_id) AS has_push,
           EXISTS (SELECT 1 FROM whatsapp_optins w WHERE w.user_id = a.user_id AND w.verified_at IS NOT NULL AND w.revoked_at IS NULL) AS has_wa
    FROM alerts a JOIN saved_searches s ON s.id = a.saved_search_id
    WHERE a.active AND s.deleted_at IS NULL`;

  let queued = 0;
  for (const a of alerts) {
    const f = parseFilters(a.filters.business, new URLSearchParams(a.filters.qs));
    for (const trig of a.triggers) {
      const evs = byTrigger.get(trig);
      if (!evs?.length) continue;
      const ids = [...new Set(evs.map((e) => e.listing_id))];
      const conds = buildConditions(f, { anyStatus: trig === "sold_or_withdrawn" });
      const matched = await sql<{ id: string }[]>`
        SELECT l.id FROM listings l JOIN properties p ON p.id = l.property_id
        WHERE ${and(conds)} AND l.id = ANY(${sql.array(ids)}::uuid[])`;
      const ok = new Set(matched.map((m) => m.id));
      const channels = ["email", ...(a.has_push ? ["push"] : []), ...(a.has_wa ? ["whatsapp"] : [])];
      const rows = evs.filter((e) => ok.has(e.listing_id)).flatMap((e) => channels.map((channel) => ({ alert_id: a.id, listing_event_id: e.id, listing_id: e.listing_id, channel, status: "queued" })));
      if (rows.length) {
        const res = await sql`INSERT INTO alert_deliveries ${sql(rows)} ON CONFLICT (alert_id, listing_event_id, channel) DO NOTHING RETURNING id`;
        queued += res.length;
      }
    }
  }

  const all = events.map((e) => e.id);
  await sql`UPDATE listing_events SET processed_at = now() WHERE id = ANY(${sql.array(all)}::uuid[])`;
  void irrelevant;
  return { events: events.length, alerts: alerts.length, queued };
}

const EVENT_LABEL = {
  pt: { new_listing: "Novo no mercado", price_drop: (a: string, b: string) => `Preço desceu de ${a} para ${b}`, back_on_market: "Voltou ao mercado", sold_or_withdrawn: "Vendido ou retirado" },
  en: { new_listing: "New on the market", price_drop: (a: string, b: string) => `Price dropped from ${a} to ${b}`, back_on_market: "Back on the market", sold_or_withdrawn: "Sold or withdrawn" },
};

export interface DigestResult {
  alerts: number;
  emails: number;
}

/** Sends one digest per alert of the given frequency that has queued deliveries. */
export async function sendDigests(frequency: "instant" | "daily" | "weekly"): Promise<DigestResult> {
  const alerts = await sql<{ id: string; unsubscribe_token: string; name: string; filters: { business: "sale" | "rent"; qs: string; geoSlugs?: { district?: string; municipality?: string; parish?: string } }; email: string; locale: string }[]>`
    SELECT a.id, a.unsubscribe_token, s.name, s.filters, u.email, u.locale
    FROM alerts a JOIN saved_searches s ON s.id = a.saved_search_id JOIN users u ON u.id = a.user_id
    WHERE a.active AND a.frequency = ${frequency} AND u.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM alert_deliveries d WHERE d.alert_id = a.id AND d.status = 'queued' AND d.channel = 'email')`;

  let emails = 0;
  for (const a of alerts) {
    const rows = await sql<{ id: string; type: string; from_price: number | null; to_price: number | null; reference: string; title: string; price: number; business: string; parish: string | null; municipality: string | null; image: string | null }[]>`
      SELECT d.id, e.type, e.from_price::float8, e.to_price::float8, p.reference, l.title, l.price::float8 AS price, l.business,
             pa.name AS parish, mu.name AS municipality,
             (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS image
      FROM alert_deliveries d JOIN listing_events e ON e.id = d.listing_event_id JOIN listings l ON l.id = d.listing_id
      JOIN properties p ON p.id = l.property_id
      LEFT JOIN geo_parishes pa ON pa.code = p.parish_code LEFT JOIN geo_municipalities mu ON mu.code = p.municipality_code
      WHERE d.alert_id = ${a.id} AND d.status = 'queued' AND d.channel = 'email' ORDER BY e.occurred_at DESC LIMIT 200`;
    if (!rows.length) continue;
    const locale = a.locale === "en" ? "en" : "pt";
    const L = EVENT_LABEL[locale];
    const perMonth = a.filters.business === "rent" ? (locale === "pt" ? "/mês" : "/month") : "";
    const items: DigestItem[] = rows.slice(0, 15).map((r) => {
      const trig = triggerFor(r.type)!;
      const change = trig === "price_drop" && r.from_price && r.to_price ? L.price_drop(formatEur(r.from_price), formatEur(r.to_price)) : trig === "price_drop" ? L.new_listing : L[trig as "new_listing"];
      return {
        title: r.title,
        place: [r.parish, r.municipality].filter(Boolean).join(", "),
        price: formatEur(r.price) + perMonth,
        change: typeof change === "string" ? change : "",
        url: `${siteUrl}${locale === "en" ? "/en" : ""}/imovel/${r.reference.toLowerCase()}`,
        image: r.image ? (r.image.startsWith("http") ? r.image : siteUrl + r.image) : null,
      };
    });
    const f = parseFilters(a.filters.business, new URLSearchParams(a.filters.qs));
    const searchUrl = siteUrl + buildSearchHref(f, a.filters.geoSlugs ?? {});
    const unsubscribeUrl = `${siteUrl}/alertas/cancelar/${a.unsubscribe_token}`;
    try {
      await sendMail({
        to: a.email,
        subject: locale === "pt" ? `${rows.length} ${rows.length === 1 ? "novidade" : "novidades"}: ${a.name}` : `${rows.length} ${rows.length === 1 ? "update" : "updates"}: ${a.name}`,
        react: createElement(AlertDigestEmail, { searchName: a.name, items, more: Math.max(0, rows.length - items.length), searchUrl, unsubscribeUrl, locale }),
        headers: { "List-Unsubscribe": `<${siteUrl}/api/alerts/unsubscribe?token=${a.unsubscribe_token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        devHint: `Alert digest → ${a.email} (${rows.length} items)`,
      });
      await sql`UPDATE alert_deliveries SET status = 'sent', sent_at = now() WHERE id = ANY(${sql.array(rows.map((r) => r.id))}::uuid[])`;
      await sql`UPDATE alerts SET last_run_at = now() WHERE id = ${a.id}`;
      emails++;
    } catch (e) {
      console.error("[alerts] email failed", a.id, e);
      await sql`UPDATE alert_deliveries SET status = 'failed' WHERE id = ANY(${sql.array(rows.map((r) => r.id))}::uuid[])`;
    }
  }
  return { alerts: alerts.length, emails };
}
