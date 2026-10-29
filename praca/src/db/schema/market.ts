import { sql } from "drizzle-orm";
import {
  boolean,
  date,
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
import { users } from "./auth";
import { createdAt, deletedAt, pk, ts, updatedAt } from "./_helpers";
import { businessEnum, propertyTypeEnum } from "./property";

export const geoLevelEnum = pgEnum("geo_level", ["country", "district", "municipality", "parish"]);

/** Aggregated/anonymised closing prices from licensed partners (never individual deeds). */
export const transactions = pgTable(
  "transactions",
  {
    id: pk(),
    geoLevel: geoLevelEnum("geo_level").notNull(),
    geoCode: text("geo_code").notNull(),
    propertyType: propertyTypeEnum("property_type"),
    typology: smallint("typology"),
    period: date("period").notNull(), // first day of the month/quarter
    medianPricePerM2: numeric("median_price_per_m2", { precision: 10, scale: 2, mode: "number" }).notNull(),
    n: integer("n").notNull(),
    source: text("source").notNull(),
    validFrom: ts("valid_from").notNull().defaultNow(),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [// NULL = "all types/typologies": coalesce so the uniqueness also covers aggregate rows.
  uniqueIndex("transactions_uq").on(t.geoLevel, t.geoCode, sql`coalesce(enum_text(${t.propertyType}), '*')`, sql`coalesce(${t.typology}, -1)`, t.period, t.source)],
);

export const marketIndicators = pgTable(
  "market_indicators",
  {
    id: pk(),
    geoLevel: geoLevelEnum("geo_level").notNull(),
    geoCode: text("geo_code").notNull(), // "PT" for country
    business: businessEnum("business").notNull(),
    propertyType: propertyTypeEnum("property_type"), // null = all types
    typology: smallint("typology"), // null = all
    period: date("period").notNull(), // month start
    medianPricePerM2: numeric("median_price_per_m2", { precision: 10, scale: 2, mode: "number" }),
    p25PricePerM2: numeric("p25_price_per_m2", { precision: 10, scale: 2, mode: "number" }),
    p75PricePerM2: numeric("p75_price_per_m2", { precision: 10, scale: 2, mode: "number" }),
    medianPrice: numeric("median_price", { precision: 12, scale: 2, mode: "number" }),
    n: integer("n").notNull(),
    yoyChange: numeric("yoy_change", { precision: 6, scale: 4, mode: "number" }),
    qoqChange: numeric("qoq_change", { precision: 6, scale: 4, mode: "number" }),
    grossYield: numeric("gross_yield", { precision: 6, scale: 4, mode: "number" }),
    medianDaysOnMarket: integer("median_days_on_market"),
    avgAskingDiscount: numeric("avg_asking_discount", { precision: 6, scale: 4, mode: "number" }),
    /** Level actually used when n < 10: the number is aggregated up and says so. */
    aggregatedFrom: geoLevelEnum("aggregated_from"),
    source: text("source").notNull().default("computed"),
    isSeed: boolean("is_seed").notNull().default(false),
    computedAt: ts("computed_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("market_indicators_uq").on(
      t.geoLevel,
      t.geoCode,
      t.business,
      sql`coalesce(enum_text(${t.propertyType}), '*')`,
      sql`coalesce(${t.typology}, -1)`,
      t.period,
    ),
    index("market_indicators_lookup_idx").on(t.geoLevel, t.geoCode, t.business, t.period.desc()),
  ],
);

export const newDevelopments = pgTable(
  "new_developments",
  {
    id: pk(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    developer: text("developer").notNull(),
    phase: text("phase").notNull(), // planning | licensing | construction | selling | delivered
    municipalityCode: text("municipality_code"),
    parishCode: text("parish_code"),
    lat: numeric("lat", { mode: "number" }),
    lng: numeric("lng", { mode: "number" }),
    totalUnits: integer("total_units"),
    availableUnits: integer("available_units"),
    expectedDelivery: date("expected_delivery"),
    priceFrom: numeric("price_from", { precision: 12, scale: 2, mode: "number" }),
    description: text("description"),
    website: text("website"),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("new_developments_slug_uq").on(t.slug), index("new_developments_muni_idx").on(t.municipalityCode)],
);

export const developmentUnits = pgTable(
  "development_units",
  {
    id: pk(),
    developmentId: uuid("development_id").notNull().references(() => newDevelopments.id, { onDelete: "cascade" }),
    typology: smallint("typology"),
    area: numeric("area", { precision: 8, scale: 2, mode: "number" }),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }),
    status: text("status").notNull().default("available"),
    floor: smallint("floor"),
  },
  (t) => [index("development_units_dev_idx").on(t.developmentId)],
);

/** IMT, Imposto de Selo, etc. Never hardcoded in code: every row has a validity start and a source note. See docs/FISCAL.md. */
export const fiscalTables = pgTable(
  "fiscal_tables",
  {
    id: pk(),
    tax: text("tax").notNull(), // imt | stamp_duty_purchase | stamp_duty_mortgage | imi | capital_gains ...
    scope: text("scope").notNull(), // e.g. hpp_mainland, hpp_islands, other_urban, rustic
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    /** Brackets: [{ upTo: number|null, rate: number, deduction: number }] — rate as fraction (0.02). */
    brackets: jsonb("brackets").$type<{ upTo: number | null; rate: number; deduction: number; flat?: boolean }[]>().notNull(),
    sourceNote: text("source_note").notNull(),
    verifiedAt: date("verified_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("fiscal_tables_uq").on(t.tax, t.scope, t.validFrom)],
);

export const rates = pgTable(
  "rates",
  {
    id: pk(),
    code: text("code").notNull(), // euribor_3m | euribor_6m | euribor_12m
    validFrom: date("valid_from").notNull(),
    value: numeric("value", { precision: 7, scale: 4, mode: "number" }).notNull(), // percent, e.g. 2.4150
    source: text("source").notNull(),
    isSeed: boolean("is_seed").notNull().default(false),
  },
  (t) => [uniqueIndex("rates_uq").on(t.code, t.validFrom)],
);

export const articles = pgTable(
  "articles",
  {
    id: pk(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull(), // MDX
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    coverUrl: text("cover_url"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    locale: text("locale").notNull().default("pt"),
    publishedAt: ts("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex("articles_slug_uq").on(t.slug, t.locale), index("articles_published_idx").on(t.publishedAt.desc())],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: pk(),
    email: text("email").notNull(),
    confirmedAt: ts("confirmed_at"),
    unsubscribedAt: ts("unsubscribed_at"),
    token: text("token").notNull(),
    consentVersion: text("consent_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("newsletter_email_uq").on(sql`lower(${t.email})`)],
);
