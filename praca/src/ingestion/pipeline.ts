import { sql } from "@/db";
import { fingerprint } from "@/lib/fingerprint";
import { findDuplicate } from "./dedupe-db";
import { locate } from "./geocode";
import { normalizeRecord } from "./normalize";
import type { NormalizedListing, RunMode, RunStats, SourceAdapter } from "./types";

export interface RunOptions {
  sourceId: string;
  adapter: SourceAdapter;
  content: string;
  mode?: RunMode;
  mapping?: Record<string, string>;
  defaultBusiness?: "sale" | "rent";
  triggeredBy?: string | null;
}

export interface RunResult {
  runId: string;
  status: "success" | "partial" | "failed";
  stats: RunStats;
  errors: { externalId: string | null; stage: string; message: string }[];
}

const TRANSIENT = new Set(["40001", "40P01", "55P03"]); // serialization failure, deadlock, lock timeout

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries - 1 || !TRANSIENT.has((e as { code?: string }).code ?? "")) throw e;
      await new Promise((r) => setTimeout(r, 100 * 2 ** i));
    }
  }
}

type Source = { id: string; slug: string; licence: string; enabled: boolean; organization_id: string | null; is_seed: boolean; kind: string };

/** Sources need a stated licence/legal basis and must be enabled: the pipeline refuses to ingest anything else. */
async function loadSource(id: string): Promise<Source> {
  const [s] = await sql<Source[]>`SELECT id, slug, licence, enabled, organization_id, is_seed, kind::text AS kind FROM sources WHERE id = ${id}`;
  if (!s) throw new Error("Fonte não encontrada.");
  if (!s.enabled) throw new Error("A fonte está desativada.");
  if (!s.licence || s.licence.trim().length < 3) throw new Error("A fonte não tem licença/base legal registada.");
  return s;
}

/** Keeps exactly one primary listing per (property, business): the oldest active one. */
export async function refreshPrimary(propertyId: string) {
  await sql`
    WITH ranked AS (
      SELECT id, row_number() OVER (PARTITION BY business ORDER BY published_at ASC, created_at ASC) AS rn
      FROM listings WHERE property_id = ${propertyId} AND status = 'active' AND deleted_at IS NULL)
    UPDATE listings l SET is_primary = (r.rn = 1) FROM ranked r WHERE l.id = r.id AND l.is_primary <> (r.rn = 1)`;
}

const pricePerM2 = (price: number, n: NormalizedListing) => {
  const base = n.usableArea ?? (n.type === "land" ? n.plotArea : null);
  return base ? Math.round((price / base) * 100) / 100 : null;
};

/**
 * Runs one ingestion: parse → normalise/validate → geocode → dedupe → upsert, with per-record error capture
 * (a bad row never aborts the run), price history/events for the alert engine, and (mode "full") withdrawal of adverts
 * that disappeared from the feed.
 */
export async function runIngestion(opts: RunOptions): Promise<RunResult> {
  const source = await loadSource(opts.sourceId);
  const mode = opts.mode ?? "incremental";
  const stats: RunStats = { received: 0, created: 0, updated: 0, merged: 0, rejected: 0, review: 0, withdrawn: 0 };
  const errors: RunResult["errors"] = [];
  const [run] = await sql<{ id: string; started_at: Date }[]>`INSERT INTO ingestion_runs (source_id, triggered_by) VALUES (${source.id}, ${opts.triggeredBy ?? null}) RETURNING id, started_at`;
  const fail = async (externalId: string | null, stage: string, message: string, payload?: unknown) => {
    stats.rejected++;
    if (errors.length < 200) errors.push({ externalId, stage, message });
    await sql`INSERT INTO ingestion_errors (run_id, external_id, stage, message, payload) VALUES (${run!.id}, ${externalId}, ${stage}, ${message.slice(0, 500)}, ${payload ? sql.json(payload as never) : null})`.catch(() => {});
  };

  let status: RunResult["status"] = "success";
  try {
    const parsed = opts.adapter.parse(opts.content, { mapping: opts.mapping });
    for (const w of parsed.warnings) await sql`INSERT INTO ingestion_errors (run_id, stage, message) VALUES (${run!.id}, 'parse', ${w.slice(0, 500)})`;
    if (parsed.records.length === 0 && parsed.warnings.length) status = "failed";
    stats.received = parsed.records.length;

    for (const raw of parsed.records) {
      const n = normalizeRecord(raw, { mapping: opts.mapping, defaultBusiness: opts.defaultBusiness });
      if (!n.ok) {
        await fail(String((raw.id ?? raw.ref ?? raw.externalId ?? "") || "") || null, "validate", n.error);
        continue;
      }
      try {
        await withRetry(() => upsertListing(source, n.value, stats));
      } catch (e) {
        await fail(n.value.externalId, "persist", e instanceof Error ? e.message : "erro");
      }
    }

    if (mode === "full" && parsed.records.length > 0) {
      const gone = await sql<{ id: string; property_id: string }[]>`
        UPDATE listings SET status = 'withdrawn', ended_at = now(), updated_at = now()
        WHERE source_id = ${source.id} AND status = 'active' AND last_seen_at < ${run!.started_at} AND deleted_at IS NULL RETURNING id, property_id`;
      for (const g of gone) {
        await sql`INSERT INTO listing_events (listing_id, property_id, type) VALUES (${g.id}, ${g.property_id}, 'withdrawn')`;
        await refreshPrimary(g.property_id);
      }
      stats.withdrawn = gone.length;
    }
    if (status !== "failed" && stats.rejected > 0) status = stats.rejected >= stats.received ? "failed" : "partial";
  } catch (e) {
    status = "failed";
    await sql`INSERT INTO ingestion_errors (run_id, stage, message) VALUES (${run!.id}, 'parse', ${(e instanceof Error ? e.message : "erro").slice(0, 500)})`;
    errors.push({ externalId: null, stage: "parse", message: e instanceof Error ? e.message : "erro" });
  }

  await sql`UPDATE ingestion_runs SET status = ${status}, finished_at = now(), received = ${stats.received}, created = ${stats.created}, updated = ${stats.updated}, merged = ${stats.merged}, rejected = ${stats.rejected} WHERE id = ${run!.id}`;
  await sql`UPDATE sources SET last_run_at = now() WHERE id = ${source.id}`;
  return { runId: run!.id, status, stats, errors };
}

async function upsertListing(source: Source, n: NormalizedListing, stats: RunStats) {
  const [existing] = await sql<{ id: string; property_id: string; price: number; initial_price: number; status: string }[]>`
    SELECT id, property_id, price::float8 AS price, initial_price::float8 AS initial_price, status::text AS status FROM listings WHERE source_id = ${source.id} AND external_id = ${n.externalId}`;

  if (existing) {
    const changed = Math.abs(existing.price - n.price) > 0.5;
    const reactivated = existing.status === "withdrawn" || existing.status === "expired";
    const dropPct = n.price < existing.initial_price ? Math.round(((existing.initial_price - n.price) / existing.initial_price) * 10000) / 100 : 0;
    await sql`
      UPDATE listings SET price = ${n.price}, price_per_m2 = ${pricePerM2(n.price, n)}, price_drop_pct = ${dropPct},
        last_price_change_at = ${changed ? sql`now()` : sql`last_price_change_at`}, status = ${reactivated ? "active" : existing.status}::listing_status,
        ended_at = ${reactivated ? null : sql`ended_at`}, title = ${n.title}, description = ${n.description ?? null}, url = ${n.url ?? null},
        advertiser_name = ${n.advertiserName ?? null}, last_seen_at = now(), updated_at = now()
      WHERE id = ${existing.id}`;
    if (changed) {
      await sql`INSERT INTO listing_price_history (listing_id, price) VALUES (${existing.id}, ${n.price})`;
      await sql`INSERT INTO listing_events (listing_id, property_id, type, from_price, to_price) VALUES (${existing.id}, ${existing.property_id}, ${n.price < existing.price ? "price_drop" : "price_rise"}::listing_event_type, ${existing.price}, ${n.price})`;
    }
    if (reactivated) {
      await sql`INSERT INTO listing_events (listing_id, property_id, type) VALUES (${existing.id}, ${existing.property_id}, 'returned')`;
      await refreshPrimary(existing.property_id);
    }
    stats.updated++;
    return;
  }

  const at = await locate(n);
  if (!at) throw new Error("Não foi possível localizar o imóvel (sem coordenadas, código postal nem concelho conhecido).");

  const dup = await findDuplicate(n, at);
  let propertyId: string;
  let merged = false;
  let reviewWith: { propertyId: string; score: number; signals: Record<string, number> } | null = null;

  if (dup && dup.score.decision === "merge") {
    propertyId = dup.propertyId;
    merged = true;
  } else {
    if (dup) reviewWith = { propertyId: dup.propertyId, score: dup.score.score, signals: dup.score.signals };
    const [p] = await sql<{ id: string }[]>`
      INSERT INTO properties (reference, fingerprint, type, typology, bedrooms, bathrooms, usable_area, gross_area, plot_area, year_built, floor, condition, energy_class,
        parking_spaces, elevator, balcony, terrace, pool, garden, furnished, pets_allowed, address, postal_code, district_code, municipality_code, parish_code, lat, lng, geo_precision, is_seed)
      VALUES ('PR-' || lpad(nextval('property_reference_seq')::text, 6, '0'), ${fingerprint({ type: n.type, typology: n.typology, usableArea: n.usableArea, floor: n.floor, lat: at.lat, lng: at.lng })},
        ${n.type}::property_type, ${n.typology ?? null}, ${n.bedrooms ?? null}, ${n.bathrooms ?? null}, ${n.usableArea ?? null}, ${n.grossArea ?? null}, ${n.plotArea ?? null}, ${n.yearBuilt ?? null}, ${n.floor ?? null},
        ${n.condition ?? null}::property_condition, ${n.energyClass ?? null}::energy_class, ${n.parkingSpaces ?? 0}, ${n.elevator ?? false}, ${n.balcony ?? false}, ${n.terrace ?? false}, ${n.pool ?? false}, ${n.garden ?? false},
        ${n.furnished ?? null}, ${n.petsAllowed ?? null}, ${n.address ?? null}, ${n.postalCode ?? null}, ${at.districtCode}, ${at.municipalityCode}, ${at.parishCode},
        ${at.lat}, ${at.lng}, ${at.precision}::geo_precision, ${source.is_seed})
      RETURNING id`;
    propertyId = p!.id;
  }

  const published = n.publishedAt ?? new Date();
  const [l] = await sql<{ id: string }[]>`
    INSERT INTO listings (property_id, source_id, external_id, business, price, initial_price, price_per_m2, status, is_primary, advertiser_type, advertiser_name, agency_id,
      contact_email, contact_phone, url, title, description, published_at, first_seen_at, last_seen_at, is_seed)
    VALUES (${propertyId}, ${source.id}, ${n.externalId}, ${n.business}::business, ${n.price}, ${n.price}, ${pricePerM2(n.price, n)}, 'active', false, ${n.advertiserType}::advertiser_type, ${n.advertiserName ?? null},
      ${source.organization_id}, ${n.contactEmail ?? null}, ${n.contactPhone ?? null}, ${n.url ?? null}, ${n.title}, ${n.description ?? null}, ${published}, now(), now(), ${source.is_seed})
    RETURNING id`;
  await sql`INSERT INTO listing_price_history (listing_id, price, recorded_at) VALUES (${l!.id}, ${n.price}, ${published})`;
  await sql`INSERT INTO listing_events (listing_id, property_id, type, to_price, occurred_at) VALUES (${l!.id}, ${propertyId}, 'published', ${n.price}, now())`;
  if (merged) await sql`INSERT INTO listing_events (listing_id, property_id, type) VALUES (${l!.id}, ${propertyId}, 'merged')`;
  if (n.imageUrls.length) {
    await sql`INSERT INTO listing_media ${sql(n.imageUrls.slice(0, 40).map((url, i) => ({ listing_id: l!.id, kind: "image", url, position: i, phash: n.photoHashes?.[i] ?? null, is_illustrative: false })))}`;
  }
  await refreshPrimary(propertyId);
  if (reviewWith) {
    await sql`INSERT INTO dedupe_candidates (listing_id, candidate_property_id, score, signals) VALUES (${l!.id}, ${reviewWith.propertyId}, ${reviewWith.score}, ${sql.json(reviewWith.signals)}) ON CONFLICT DO NOTHING`;
    stats.review++;
  }
  if (merged) stats.merged++;
  else stats.created++;
}
