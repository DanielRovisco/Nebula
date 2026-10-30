"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/db";
import { parseFilters } from "@/lib/filters";
import { zonesToMultiPolygon } from "@/lib/zones";
import { checkCapacity } from "./entitlements";
import { currentUser } from "./session";

const input = z.object({
  name: z.string().trim().min(1).max(120),
  business: z.enum(["sale", "rent"]),
  qs: z.string().max(6000),
  geoSlugs: z.object({ district: z.string().max(80).optional(), municipality: z.string().max(80).optional(), parish: z.string().max(80).optional() }),
  frequency: z.enum(["instant", "daily", "weekly"]),
  triggers: z.array(z.enum(["new_listing", "price_drop", "back_on_market", "sold_or_withdrawn"])).min(1).max(4),
});

export type SaveSearchResult = { ok: true; id: string } | { ok: false; error: "auth" | "invalid" | "plan" | "quota"; limit?: number | null };

export async function saveSearch(raw: z.input<typeof input>): Promise<SaveSearchResult> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "auth" };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;

  const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM alerts WHERE user_id = ${u.id} AND active`;
  const cap = await checkCapacity(u.id, "alerts", n);
  if (!cap.allowed) return { ok: false, error: cap.reason === "plan" ? "plan" : "quota", limit: cap.limit };

  // Normalise through the same parser the search uses, so what is stored is what the engine will evaluate.
  const f = parseFilters(d.business, new URLSearchParams(d.qs));
  const qs = new URLSearchParams(d.qs);
  qs.delete("c");
  const filters = { business: d.business, qs: qs.toString(), geoSlugs: d.geoSlugs };
  const areas = f.zones.length ? JSON.stringify(zonesToMultiPolygon(f.zones)) : null;

  const [s] = await sql<{ id: string }[]>`
    INSERT INTO saved_searches (user_id, name, filters, areas)
    VALUES (${u.id}, ${d.name}, ${sql.json(filters)}, ${areas ? sql`ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${areas}), 4326)))` : null})
    RETURNING id`;
  await sql`INSERT INTO alerts (saved_search_id, user_id, frequency, triggers, unsubscribe_token)
            VALUES (${s!.id}, ${u.id}, ${d.frequency}, ${sql.array(d.triggers)}::alert_trigger[], ${randomBytes(18).toString("base64url")})`;
  return { ok: true, id: s!.id };
}

const uuid = z.uuid();

export async function updateAlert(alertId: string, patch: { frequency?: "instant" | "daily" | "weekly"; active?: boolean }) {
  const u = await currentUser();
  if (!u || !uuid.safeParse(alertId).success) return { ok: false };
  if (patch.frequency) await sql`UPDATE alerts SET frequency = ${patch.frequency} WHERE id = ${alertId} AND user_id = ${u.id}`;
  if (patch.active !== undefined) {
    if (patch.active) {
      const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM alerts WHERE user_id = ${u.id} AND active AND id <> ${alertId}`;
      const cap = await checkCapacity(u.id, "alerts", n);
      if (!cap.allowed) return { ok: false, error: "quota" as const };
    }
    await sql`UPDATE alerts SET active = ${patch.active} WHERE id = ${alertId} AND user_id = ${u.id}`;
  }
  return { ok: true };
}

export async function deleteSavedSearch(id: string) {
  const u = await currentUser();
  if (!u || !uuid.safeParse(id).success) return { ok: false };
  await sql`UPDATE saved_searches SET deleted_at = now() WHERE id = ${id} AND user_id = ${u.id}`;
  await sql`DELETE FROM alerts WHERE saved_search_id = ${id} AND user_id = ${u.id}`;
  return { ok: true };
}

/** One-click unsubscribe by secret token (no login): used by the email footer page and RFC 8058 POST. */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean }> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { ok: false };
  const r = await sql`UPDATE alerts SET active = false WHERE unsubscribe_token = ${token} RETURNING id`;
  return { ok: r.length > 0 };
}
