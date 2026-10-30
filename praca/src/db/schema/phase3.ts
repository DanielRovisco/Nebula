import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, multiPolygon, pk, ts } from "./_helpers";
import { users } from "./auth";
import { listings } from "./property";

/** Web Push endpoints (one per browser/device). */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: pk(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_uq").on(t.endpoint), index("push_subscriptions_user_idx").on(t.userId)],
);

/** Hazard layers. Every layer names its source, licence and reference date; `is_seed` marks illustrative demo layers. */
export const riskLayers = pgTable(
  "risk_layers",
  {
    id: pk(),
    code: text("code").notNull(), // flood | seismic | fire | noise
    name: text("name").notNull(),
    hazard: text("hazard").notNull(),
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    license: text("license"),
    asOf: date("as_of"),
    isSeed: boolean("is_seed").notNull().default(false),
    levels: jsonb("levels").$type<{ key: string; label: string; rank: number }[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("risk_layers_code_uq").on(t.code)],
);

export const riskFeatures = pgTable(
  "risk_features",
  {
    id: pk(),
    layerId: uuid("layer_id").notNull().references(() => riskLayers.id, { onDelete: "cascade" }),
    level: text("level").notNull(),
    geom: multiPolygon("geom").notNull(),
    props: jsonb("props").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [index("risk_features_layer_idx").on(t.layerId), index("risk_features_geom_gist").using("gist", t.geom)],
);

/** Rule-based anti-fraud signals per listing (recomputed idempotently). */
export const fraudSignals = pgTable(
  "fraud_signals",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    severity: integer("severity").notNull(), // 1 info, 2 warning, 3 high
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("fraud_signals_uq").on(t.listingId, t.code), index("fraud_signals_listing_idx").on(t.listingId)],
);

/** Verification evidence behind the "verified" badge. The badge is shown only when a row exists. */
export const listingVerifications = pgTable(
  "listing_verifications",
  {
    id: pk(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    method: text("method").notNull(), // licence_ami | owner_document | site_visit
    reference: text("reference"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: ts("verified_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
  },
  (t) => [index("listing_verifications_listing_idx").on(t.listingId)],
);

/** Cached routing responses (isochrones), so the provider's daily quota is spent once per place and mode. */
export const isochroneCache = pgTable("isochrone_cache", {
  key: text("key").primaryKey(),
  provider: text("provider").notNull(),
  geojson: jsonb("geojson").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
});
