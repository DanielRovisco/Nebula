import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, deletedAt, pk, ts, tsvector, updatedAt } from "./_helpers";
import { organizations, users } from "./auth";

export const propertyTypeEnum = pgEnum("property_type", [
  "apartment",
  "house",
  "land",
  "shop",
  "office",
  "warehouse",
  "garage",
  "building",
]);
export const conditionEnum = pgEnum("property_condition", ["new", "used", "to_renovate", "under_construction"]);
export const energyClassEnum = pgEnum("energy_class", ["A+", "A", "B", "B-", "C", "D", "E", "F", "exempt"]);
export const businessEnum = pgEnum("business", ["sale", "rent"]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "withdrawn", "sold", "rented", "expired", "pending_review"]);
export const advertiserTypeEnum = pgEnum("advertiser_type", ["private", "professional"]);
export const geoPrecisionEnum = pgEnum("geo_precision", ["exact", "street", "parish"]);
export const listingEventTypeEnum = pgEnum("listing_event_type", [
  "published",
  "price_drop",
  "price_rise",
  "withdrawn",
  "returned",
  "sold",
  "rented",
  "merged",
]);
export const sourceKindEnum = pgEnum("source_kind", ["csv", "xml_feed", "json_api", "open_data", "seed", "partner", "manual"]);

export const sources = pgTable(
  "sources",
  {
    id: pk(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: sourceKindEnum("kind").notNull(),
    /** Licence / legal basis. Ingestion refuses to enable a source without it. */
    licence: text("licence").notNull(),
    licenceUrl: text("licence_url"),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    endpoint: text("endpoint"),
    format: text("format"), // kyero | custom_csv | json ...
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    frequencyMinutes: integer("frequency_minutes"),
    enabled: boolean("enabled").notNull().default(true),
    isSeed: boolean("is_seed").notNull().default(false),
    lastRunAt: ts("last_run_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("sources_slug_uq").on(t.slug)],
);

/** Canonical (deduplicated) real-estate record. A listing is one advert for it. */
export const properties = pgTable(
  "properties",
  {
    id: pk(),
    reference: text("reference").notNull(), // human-friendly, searchable: PR-000123
    fingerprint: text("fingerprint").notNull(),
    type: propertyTypeEnum("type").notNull(),
    typology: smallint("typology"), // 0..5 → T0..T5+
    bedrooms: smallint("bedrooms"),
    bathrooms: smallint("bathrooms"),
    usableArea: numeric("usable_area", { precision: 10, scale: 2, mode: "number" }),
    grossArea: numeric("gross_area", { precision: 10, scale: 2, mode: "number" }),
    plotArea: numeric("plot_area", { precision: 12, scale: 2, mode: "number" }),
    yearBuilt: smallint("year_built"),
    floor: smallint("floor"), // -1 cave, 0 rés-do-chão
    totalFloors: smallint("total_floors"),
    condition: conditionEnum("condition"),
    energyClass: energyClassEnum("energy_class"),
    parkingSpaces: smallint("parking_spaces").notNull().default(0),
    elevator: boolean("elevator").notNull().default(false),
    balcony: boolean("balcony").notNull().default(false),
    terrace: boolean("terrace").notNull().default(false),
    pool: boolean("pool").notNull().default(false),
    garden: boolean("garden").notNull().default(false),
    view: text("view"), // mar | rio | serra | cidade | jardim
    furnished: boolean("furnished"),
    petsAllowed: boolean("pets_allowed"),
    tenanted: boolean("tenanted").notNull().default(false),
    address: text("address"),
    postalCode: text("postal_code"),
    districtCode: text("district_code"),
    municipalityCode: text("municipality_code"),
    parishCode: text("parish_code"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    geoPrecision: geoPrecisionEnum("geo_precision").notNull().default("exact"),
    cadastralRef: text("cadastral_ref"),
    dedupeConfidence: numeric("dedupe_confidence", { precision: 4, scale: 3, mode: "number" }),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("properties_reference_uq").on(t.reference),
    // BTREE: exact-match candidate lookup during dedupe.
    index("properties_fingerprint_idx").on(t.fingerprint),
    // The geography(Point) `location` column + its GiST index live in the custom migration 0001 (Drizzle cannot model them).
    // Composite BTREEs mirror the dominant search predicates (geo code + type).
    index("properties_muni_type_idx").on(t.municipalityCode, t.type),
    index("properties_parish_idx").on(t.parishCode),
    index("properties_district_idx").on(t.districtCode),
    index("properties_postal_idx").on(t.postalCode),
    // GIN trigram: address similarity for dedupe and autocomplete.
    index("properties_address_trgm").using("gin", t.address.op("gin_trgm_ops")),
  ],
);

export const listings = pgTable(
  "listings",
  {
    id: pk(),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    externalId: text("external_id").notNull(),
    business: businessEnum("business").notNull(),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    initialPrice: numeric("initial_price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    pricePerM2: numeric("price_per_m2", { precision: 10, scale: 2, mode: "number" }),
    priceDropPct: numeric("price_drop_pct", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    lastPriceChangeAt: ts("last_price_change_at"),
    status: listingStatusEnum("status").notNull().default("active"),
    /** One primary listing per (property, business): the one shown in search results. */
    isPrimary: boolean("is_primary").notNull().default(true),
    advertiserType: advertiserTypeEnum("advertiser_type").notNull(),
    advertiserName: text("advertiser_name"),
    agencyId: uuid("agency_id").references(() => organizations.id, { onDelete: "set null" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    url: text("url"),
    title: text("title").notNull(),
    description: text("description"),
    videoUrl: text("video_url"),
    tourUrl: text("tour_url"),
    publishedAt: ts("published_at").notNull(),
    firstSeenAt: ts("first_seen_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    endedAt: ts("ended_at"),
    verified: boolean("verified").notNull().default(false),
    fraudScore: smallint("fraud_score").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    search: tsvector("search").generatedAlwaysAs(
      sql`to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, ''))`,
    ),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("listings_source_external_uq").on(t.sourceId, t.externalId),
    index("listings_property_idx").on(t.propertyId),
    // Partial BTREE: the hot path is "active primary listings of a business, by price/date".
    index("listings_search_price_idx").on(t.business, t.price).where(sql`status = 'active' AND is_primary`),
    index("listings_search_date_idx").on(t.business, t.publishedAt.desc()).where(sql`status = 'active' AND is_primary`),
    index("listings_search_drop_idx").on(t.business, t.priceDropPct.desc()).where(sql`status = 'active' AND is_primary`),
    index("listings_agency_idx").on(t.agencyId),
    // GIN FTS for the keywords filter.
    index("listings_search_fts").using("gin", t.search),
  ],
);

export const listingPriceHistory = pgTable(
  "listing_price_history",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    recordedAt: ts("recorded_at").notNull().defaultNow(),
  },
  (t) => [index("listing_price_history_idx").on(t.listingId, t.recordedAt)],
);

export const listingEvents = pgTable(
  "listing_events",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    type: listingEventTypeEnum("type").notNull(),
    fromPrice: numeric("from_price", { precision: 12, scale: 2, mode: "number" }),
    toPrice: numeric("to_price", { precision: 12, scale: 2, mode: "number" }),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    /** Set once the alert engine has consumed the event (idempotency). */
    processedAt: ts("processed_at"),
  },
  (t) => [
    index("listing_events_listing_idx").on(t.listingId, t.occurredAt),
    index("listing_events_property_idx").on(t.propertyId),
    // Partial: the alert engine only scans unprocessed events.
    index("listing_events_pending_idx").on(t.occurredAt).where(sql`processed_at IS NULL`),
  ],
);

export const listingMedia = pgTable(
  "listing_media",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("image"), // image | floorplan | video
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    blurDataUrl: text("blur_data_url"),
    phash: text("phash"), // perceptual hash (64-bit hex) for photo-based dedupe
    position: smallint("position").notNull().default(0),
    alt: text("alt"),
    isIllustrative: boolean("is_illustrative").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("listing_media_listing_idx").on(t.listingId, t.position), index("listing_media_phash_idx").on(t.phash)],
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: pk(),
    sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("running"), // running | success | partial | failed
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
    received: integer("received").notNull().default(0),
    created: integer("created").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    merged: integer("merged").notNull().default(0),
    rejected: integer("rejected").notNull().default(0),
    triggeredBy: uuid("triggered_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("ingestion_runs_source_idx").on(t.sourceId, t.startedAt.desc())],
);

export const ingestionErrors = pgTable(
  "ingestion_errors",
  {
    id: pk(),
    runId: uuid("run_id").notNull().references(() => ingestionRuns.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    stage: text("stage").notNull(), // parse | validate | geocode | dedupe | persist
    message: text("message").notNull(),
    payload: jsonb("payload"),
    createdAt: createdAt(),
  },
  (t) => [index("ingestion_errors_run_idx").on(t.runId)],
);

/** Dedupe candidates below the auto-merge threshold wait here for manual review in the admin. */
export const dedupeCandidates = pgTable(
  "dedupe_candidates",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    candidatePropertyId: uuid("candidate_property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 4, scale: 3, mode: "number" }).notNull(),
    signals: jsonb("signals").$type<Record<string, number>>().notNull().default({}),
    status: text("status").notNull().default("pending"), // pending | merged | rejected
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("dedupe_candidates_pending_idx").on(t.score.desc()).where(sql`status = 'pending'`),
    uniqueIndex("dedupe_candidates_pair_uq").on(t.listingId, t.candidatePropertyId),
  ],
);

/** Contact-form submissions to advertisers (RGPD: consent recorded, retention job purges after 24 months). */
export const inquiries = pgTable(
  "inquiries",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message").notNull(),
    consentVersion: text("consent_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("inquiries_listing_idx").on(t.listingId, t.createdAt)],
);
