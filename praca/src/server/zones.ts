"use server";

import { z } from "zod";
import { sql } from "@/db";
import { decodeZones, encodeZones, zonesToMultiPolygon, type Ring } from "@/lib/zones";
import { currentUser } from "./session";

export interface SavedZone {
  id: string;
  name: string;
  zones: string; // encoded, same format as the `zonas` query parameter
}

export async function listSavedZones(): Promise<{ auth: boolean; items: SavedZone[] }> {
  const u = await currentUser();
  if (!u) return { auth: false, items: [] };
  const rows = await sql<{ id: string; name: string; polygons: Ring[] }[]>`SELECT id, name, polygons FROM saved_zones WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 50`;
  return { auth: true, items: rows.map((r) => ({ id: r.id, name: r.name, zones: encodeZones(r.polygons) })) };
}

const saveSchema = z.object({ name: z.string().trim().min(1).max(80), zones: z.string().max(8000) });

export async function saveZone(input: { name: string; zones: string }): Promise<{ ok: boolean; error?: "auth" | "invalid" | "limit" }> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "auth" };
  const parsed = saveSchema.safeParse(input);
  const rings = parsed.success ? decodeZones(parsed.data.zones) : [];
  if (!parsed.success || !rings.length) return { ok: false, error: "invalid" };
  const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM saved_zones WHERE user_id = ${u.id}`;
  if (n >= 50) return { ok: false, error: "limit" };
  await sql`INSERT INTO saved_zones (user_id, name, polygons, geom)
            VALUES (${u.id}, ${parsed.data.name}, ${sql.json(rings)}, ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(zonesToMultiPolygon(rings))}), 4326))))`;
  return { ok: true };
}

export async function deleteZone(id: string): Promise<{ ok: boolean }> {
  const u = await currentUser();
  if (!u || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await sql`DELETE FROM saved_zones WHERE id = ${id} AND user_id = ${u.id}`;
  return { ok: true };
}
