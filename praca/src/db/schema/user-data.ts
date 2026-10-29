import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";
import { createdAt, deletedAt, multiPolygon, pk, ts, updatedAt } from "./_helpers";
import { listings, properties } from "./property";

export const alertFrequencyEnum = pgEnum("alert_frequency", ["instant", "daily", "weekly"]);
export const alertTriggerEnum = pgEnum("alert_trigger", ["new_listing", "price_drop", "back_on_market", "sold_or_withdrawn"]);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: pk(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Serialised, Zod-validated filter object (same shape as the URL query). */
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull(),
    /** Union of the drawn zones, for geospatial alert matching. */
    areas: multiPolygon("areas"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId), index("saved_searches_areas_gist").using("gist", t.areas)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: pk(),
    savedSearchId: uuid("saved_search_id").notNull().references(() => savedSearches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    frequency: alertFrequencyEnum("frequency").notNull().default("daily"),
    triggers: alertTriggerEnum("triggers").array().notNull().default(sql`ARRAY['new_listing','price_drop']::alert_trigger[]`),
    channels: text("channels").array().notNull().default(sql`ARRAY['email']::text[]`),
    active: boolean("active").notNull().default(true),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    lastRunAt: ts("last_run_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("alerts_unsub_uq").on(t.unsubscribeToken), index("alerts_active_idx").on(t.frequency).where(sql`active`)],
);

export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    id: pk(),
    alertId: uuid("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
    listingEventId: uuid("listing_event_id"),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    channel: text("channel").notNull().default("email"),
    status: text("status").notNull().default("queued"), // queued | sent | failed
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  // Idempotency: the same event is never queued twice for the same alert.
  (t) => [uniqueIndex("alert_deliveries_uq").on(t.alertId, t.listingEventId, t.channel)],
);

export const favoriteFolders = pgTable(
  "favorite_folders",
  {
    id: pk(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("favorite_folders_user_idx").on(t.userId)],
);

export const favorites = pgTable(
  "favorites",
  {
    id: pk(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => favoriteFolders.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("favorites_user_property_uq").on(t.userId, t.propertyId)],
);

export const comparisons = pgTable(
  "comparisons",
  {
    id: pk(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    propertyIds: uuid("property_ids").array().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("comparisons_user_idx").on(t.userId)],
);

export const propertyViews = pgTable(
  "property_views",
  {
    id: pk(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    viewedAt: ts("viewed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("property_views_uq").on(t.userId, t.propertyId), index("property_views_recent_idx").on(t.userId, t.viewedAt.desc())],
);

export const valuations = pgTable(
  "valuations",
  {
    id: pk(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    input: jsonb("input").$type<Record<string, unknown>>().notNull(),
    estimate: numeric("estimate", { precision: 12, scale: 2, mode: "number" }),
    low: numeric("low", { precision: 12, scale: 2, mode: "number" }),
    high: numeric("high", { precision: 12, scale: 2, mode: "number" }),
    confidence: numeric("confidence", { precision: 4, scale: 3, mode: "number" }),
    method: text("method").notNull().default("weighted_median_v1"),
    createdAt: createdAt(),
  },
  (t) => [index("valuations_user_idx").on(t.userId), index("valuations_org_idx").on(t.organizationId)],
);

export const valuationComparables = pgTable(
  "valuation_comparables",
  {
    id: pk(),
    valuationId: uuid("valuation_id").notNull().references(() => valuations.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // active | sold | rented
    similarity: numeric("similarity", { precision: 4, scale: 3, mode: "number" }).notNull(),
    adjustedPrice: numeric("adjusted_price", { precision: 12, scale: 2, mode: "number" }),
    adjustments: jsonb("adjustments").$type<Record<string, number>>(),
  },
  (t) => [index("valuation_comparables_idx").on(t.valuationId)],
);

export const smartlinks = pgTable(
  "smartlinks",
  {
    id: pk(),
    slug: text("slug").notNull(),
    valuationId: uuid("valuation_id").notNull().references(() => valuations.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    refreshDaily: boolean("refresh_daily").notNull().default(true),
    expiresAt: ts("expires_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("smartlinks_slug_uq").on(t.slug)],
);

// ── CRM (every row carries organization_id; all queries MUST filter by it) ──
export const crmContacts = pgTable(
  "crm_contacts",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    kind: text("kind").notNull().default("lead"), // lead | buyer | seller | landlord | tenant | investor | fsbo
    source: text("source"),
    legalBasis: text("legal_basis"), // RGPD basis recorded per contact
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("crm_contacts_org_idx").on(t.organizationId, t.kind)],
);

export const crmDeals = pgTable(
  "crm_deals",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    stage: text("stage").notNull().default("new"), // new | contacted | visit | proposal | closing
    value: numeric("value", { precision: 12, scale: 2, mode: "number" }),
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2, mode: "number" }),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("crm_deals_org_stage_idx").on(t.organizationId, t.stage)],
);

export const crmTasks = pgTable(
  "crm_tasks",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dueAt: ts("due_at"),
    doneAt: ts("done_at"),
    createdAt: createdAt(),
  },
  (t) => [index("crm_tasks_org_idx").on(t.organizationId, t.dueAt)],
);

export const crmNotes = pgTable(
  "crm_notes",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("crm_notes_org_idx").on(t.organizationId, t.createdAt)],
);

export const commissionShares = pgTable(
  "commission_shares",
  {
    id: pk(),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    ownerOrgId: uuid("owner_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    partnerOrgId: uuid("partner_org_id").references(() => organizations.id, { onDelete: "cascade" }),
    partnerEmail: text("partner_email"),
    splitPct: numeric("split_pct", { precision: 5, scale: 2, mode: "number" }).notNull(),
    status: text("status").notNull().default("invited"), // invited | accepted | declined | closed
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("commission_shares_owner_idx").on(t.ownerOrgId), index("commission_shares_partner_idx").on(t.partnerOrgId)],
);
