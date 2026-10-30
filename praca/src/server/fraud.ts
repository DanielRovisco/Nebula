import { sql } from "@/db";
import { fraudScore, fraudSignals, QUARANTINE_SCORE, type FraudFacts, type FraudSignal } from "@/lib/fraud";

interface Row {
  id: string;
  property_id: string;
  business: "sale" | "rent";
  price_per_m2: number | null;
  title: string;
  description: string | null;
  advertiser_type: "private" | "professional";
  verified: boolean;
  has_proof: boolean;
  adv_listings: number;
  dup_advertisers: number;
  dup_spread: number;
  zone_ppm: number | null;
  zone_n: number | null;
}

export interface FraudRun {
  scanned: number;
  flagged: number;
  quarantined: number;
}

/**
 * Recomputes the signals of every active listing (or one listing) and stores them with the resulting score.
 * Idempotent. Listings at or above QUARANTINE_SCORE that carry no verification go to moderation (`pending_review`).
 */
export async function recomputeFraudSignals(listingId?: string): Promise<FraudRun> {
  const rows = await sql<Row[]>`
    WITH adv AS (
      SELECT source_id, advertiser_name, count(*)::int AS n FROM listings WHERE status = 'active' AND deleted_at IS NULL AND advertiser_name IS NOT NULL GROUP BY 1, 2
    ), dup AS (
      SELECT property_id, count(DISTINCT coalesce(advertiser_name, source_id::text))::int AS advertisers,
             CASE WHEN min(price) > 0 THEN (max(price) - min(price)) / min(price) ELSE 0 END AS spread
      FROM listings WHERE status = 'active' AND deleted_at IS NULL GROUP BY property_id
    ), zone AS (
      SELECT DISTINCT ON (geo_code, business) geo_code, business, median_price_per_m2::float8 AS ppm, n
      FROM market_indicators WHERE geo_level = 'municipality' AND property_type IS NULL AND typology IS NULL ORDER BY geo_code, business, period DESC
    )
    SELECT l.id, l.property_id, l.business, l.price_per_m2::float8 AS price_per_m2, l.title, l.description, l.advertiser_type, l.verified,
           EXISTS (SELECT 1 FROM listing_verifications v WHERE v.listing_id = l.id AND v.revoked_at IS NULL) AS has_proof,
           coalesce(adv.n, 0) AS adv_listings, coalesce(dup.advertisers, 1) AS dup_advertisers, coalesce(dup.spread, 0)::float8 AS dup_spread,
           zone.ppm AS zone_ppm, zone.n AS zone_n
    FROM listings l JOIN properties p ON p.id = l.property_id
    LEFT JOIN adv ON adv.source_id = l.source_id AND adv.advertiser_name = l.advertiser_name
    LEFT JOIN dup ON dup.property_id = l.property_id
    LEFT JOIN zone ON zone.geo_code = p.municipality_code AND zone.business = l.business
    WHERE l.deleted_at IS NULL AND l.status IN ('active', 'pending_review') ${listingId ? sql`AND l.id = ${listingId}` : sql``}`;

  let flagged = 0;
  let quarantined = 0;
  const ids = rows.map((r) => r.id);
  const all: { listing_id: string; code: string; severity: number; detail: string }[] = [];
  const scores = new Map<string, number>();
  const toQuarantine: string[] = [];
  for (const r of rows) {
    const facts: FraudFacts = {
      business: r.business,
      pricePerM2: r.price_per_m2,
      zoneMedianPpm: r.zone_ppm,
      zoneN: r.zone_n ?? 0,
      title: r.title,
      description: r.description,
      advertiserType: r.advertiser_type,
      advertiserActiveListings: r.adv_listings,
      duplicateAdvertisers: r.dup_advertisers,
      duplicatePriceSpread: r.dup_spread,
    };
    const signals: FraudSignal[] = fraudSignals(facts);
    const score = fraudScore(signals);
    scores.set(r.id, score);
    if (signals.length) flagged++;
    for (const s of signals) all.push({ listing_id: r.id, code: s.code, severity: s.severity, detail: JSON.stringify(s.detail) });
    if (score >= QUARANTINE_SCORE && !r.verified && !r.has_proof) toQuarantine.push(r.id);
  }

  await sql.begin(async (tx) => {
    for (let i = 0; i < ids.length; i += 1000) await tx`DELETE FROM fraud_signals WHERE listing_id = ANY(${tx.array(ids.slice(i, i + 1000))}::uuid[])`;
    for (let i = 0; i < all.length; i += 500) await tx`INSERT INTO fraud_signals ${tx(all.slice(i, i + 500), "listing_id", "code", "severity", "detail")}`;
    // Only touch rows whose score changed.
    const byScore = new Map<number, string[]>();
    for (const [id, sc] of scores) byScore.set(sc, [...(byScore.get(sc) ?? []), id]);
    for (const [sc, list] of byScore) for (let i = 0; i < list.length; i += 1000) await tx`UPDATE listings SET fraud_score = ${sc} WHERE id = ANY(${tx.array(list.slice(i, i + 1000))}::uuid[]) AND fraud_score <> ${sc}`;
    if (toQuarantine.length) {
      const res = await tx`UPDATE listings SET status = 'pending_review', updated_at = now() WHERE id = ANY(${tx.array(toQuarantine)}::uuid[]) AND status = 'active' RETURNING id`;
      quarantined = res.length;
    }
  });
  return { scanned: rows.length, flagged, quarantined };
}

export async function signalsFor(listingId: string): Promise<{ code: string; severity: number; detail: Record<string, unknown> }[]> {
  return sql`SELECT code, severity, detail FROM fraud_signals WHERE listing_id = ${listingId} ORDER BY severity DESC, code`;
}
