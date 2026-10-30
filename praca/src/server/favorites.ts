"use server";

import { z } from "zod";
import { sql } from "@/db";
import { currentUser } from "./session";

const uuid = z.uuid();

export async function toggleFavorite(propertyId: string): Promise<{ auth: boolean; favorited?: boolean }> {
  const u = await currentUser();
  if (!u) return { auth: false };
  if (!uuid.safeParse(propertyId).success) return { auth: true };
  const del = await sql`DELETE FROM favorites WHERE user_id = ${u.id} AND property_id = ${propertyId} RETURNING id`;
  if (del.length) return { auth: true, favorited: false };
  const [ok] = await sql`SELECT 1 FROM properties WHERE id = ${propertyId} AND deleted_at IS NULL`;
  if (!ok) return { auth: true };
  await sql`INSERT INTO favorites (user_id, property_id) VALUES (${u.id}, ${propertyId}) ON CONFLICT DO NOTHING`;
  return { auth: true, favorited: true };
}

export async function createFolder(name: string) {
  const u = await currentUser();
  const n = z.string().trim().min(1).max(60).safeParse(name);
  if (!u || !n.success) return { ok: false };
  const [{ c } = { c: 0 }] = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM favorite_folders WHERE user_id = ${u.id}`;
  if (c >= 30) return { ok: false };
  await sql`INSERT INTO favorite_folders (user_id, name) VALUES (${u.id}, ${n.data})`;
  return { ok: true };
}

export async function deleteFolder(id: string) {
  const u = await currentUser();
  if (!u || !uuid.safeParse(id).success) return { ok: false };
  await sql`DELETE FROM favorite_folders WHERE id = ${id} AND user_id = ${u.id}`; // favorites keep existing: folder_id set null
  return { ok: true };
}

export async function moveFavorite(propertyId: string, folderId: string | null) {
  const u = await currentUser();
  if (!u || !uuid.safeParse(propertyId).success) return { ok: false };
  if (folderId) {
    if (!uuid.safeParse(folderId).success) return { ok: false };
    const [f] = await sql`SELECT 1 FROM favorite_folders WHERE id = ${folderId} AND user_id = ${u.id}`;
    if (!f) return { ok: false };
  }
  await sql`UPDATE favorites SET folder_id = ${folderId} WHERE user_id = ${u.id} AND property_id = ${propertyId}`;
  return { ok: true };
}

export async function setFavoriteNote(propertyId: string, note: string) {
  const u = await currentUser();
  if (!u || !uuid.safeParse(propertyId).success) return { ok: false };
  await sql`UPDATE favorites SET note = ${note.slice(0, 500) || null} WHERE user_id = ${u.id} AND property_id = ${propertyId}`;
  return { ok: true };
}
