import { sql } from "@/db";
import { MERGE_THRESHOLD, REVIEW_THRESHOLD, scoreDuplicate, type DedupeScore } from "@/lib/dedupe";
import type { Located } from "./geocode";
import type { NormalizedListing } from "./types";

export interface DuplicateMatch {
  propertyId: string;
  score: DedupeScore;
}

/**
 * Looks for the same physical property already in the database: same type (and typology when both known) within 150 m,
 * scored on distance, area, floor, price, address and shared photo hashes. The caller applies MERGE/REVIEW thresholds.
 */
export async function findDuplicate(n: NormalizedListing, at: Located): Promise<DuplicateMatch | null> {
  const rows = await sql<{ id: string; typology: number | null; area: number | null; floor: number | null; lat: number; lng: number; address: string | null; price: number | null; hashes: string[] | null }[]>`
    SELECT p.id, p.typology, p.usable_area::float8 AS area, p.floor, p.lat, p.lng, p.address,
           (SELECT l.price::float8 FROM listings l WHERE l.property_id = p.id AND l.business = ${n.business} ORDER BY l.is_primary DESC, l.published_at DESC LIMIT 1) AS price,
           (SELECT array_agg(m.phash) FROM listing_media m JOIN listings l ON l.id = m.listing_id WHERE l.property_id = p.id AND m.phash IS NOT NULL) AS hashes
    FROM properties p
    WHERE p.deleted_at IS NULL AND p.type = ${n.type}::property_type
      AND (${n.typology ?? null}::smallint IS NULL OR p.typology IS NULL OR p.typology = ${n.typology ?? null}::smallint)
      AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${at.lng}, ${at.lat}), 4326)::geography, 150)
    ORDER BY p.location <-> ST_SetSRID(ST_MakePoint(${at.lng}, ${at.lat}), 4326)::geography LIMIT 10`;

  let best: DuplicateMatch | null = null;
  for (const r of rows) {
    const score = scoreDuplicate(
      { type: n.type, typology: n.typology, usableArea: n.usableArea, floor: n.floor, lat: at.lat, lng: at.lng, address: n.address, price: n.price, photoHashes: n.photoHashes },
      { type: n.type, typology: r.typology, usableArea: r.area, floor: r.floor, lat: r.lat, lng: r.lng, address: r.address, price: r.price, photoHashes: r.hashes ?? [] },
    );
    if (!best || score.score > best.score.score) best = { propertyId: r.id, score };
  }
  return best && best.score.score >= REVIEW_THRESHOLD ? best : null;
}

export { MERGE_THRESHOLD, REVIEW_THRESHOLD };
