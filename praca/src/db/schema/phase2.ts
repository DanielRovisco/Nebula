import { sql } from "drizzle-orm";
import { boolean, date, doublePrecision, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, multiPolygon, pk, ts, updatedAt } from "./_helpers";
import { organizations, orgRoleEnum, users } from "./auth";
import { properties } from "./property";
import { crmContacts, crmDeals } from "./user-data";

/** Zones drawn on the map and saved by a user (GeoJSON kept for editing, geometry for spatial matching). */
export const savedZones = pgTable(
  "saved_zones",
  {
    id: pk(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    polygons: jsonb("polygons").$type<[number, number][][]>().notNull(), // array of rings [[lng,lat],...]
    geom: multiPolygon("geom"),
    createdAt: createdAt(),
  },
  (t) => [index("saved_zones_user_idx").on(t.userId), index("saved_zones_geom_gist").using("gist", t.geom)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default("agent"),
    token: text("token").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: ts("accepted_at"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invitations_token_uq").on(t.token), index("invitations_org_idx").on(t.organizationId)],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: text("events").array().notNull().default(sql`'{}'::text[]`),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("webhooks_org_idx").on(t.organizationId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: pk(),
    webhookId: uuid("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    statusCode: integer("status_code"),
    ok: boolean("ok").notNull().default(false),
    durationMs: integer("duration_ms"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("webhook_deliveries_idx").on(t.webhookId, t.createdAt.desc())],
);

/** Monthly quota counters. scope_type: user | org | key. */
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: pk(),
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    feature: text("feature").notNull(),
    period: date("period").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("usage_counters_uq").on(t.scopeType, t.scopeId, t.feature, t.period)],
);

export const geocodeCache = pgTable("geocode_cache", {
  key: text("key").primaryKey(), // normalised query
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  precision: text("precision"),
  provider: text("provider").notNull(),
  createdAt: createdAt(),
});

export const crmContactProperties = pgTable(
  "crm_contact_properties",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    relation: text("relation").notNull().default("interested"), // owner | interested | tenant
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("crm_contact_properties_uq").on(t.contactId, t.propertyId), index("crm_contact_properties_org_idx").on(t.organizationId)],
);

/** Prospection pipeline for private owners (FSBO) found through search. */
export const prospects = pgTable(
  "prospects",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    dealId: uuid("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
    status: text("status").notNull().default("new"), // new | contacted | replied | meeting | signed | discarded
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("prospects_org_property_uq").on(t.organizationId, t.propertyId), index("prospects_org_status_idx").on(t.organizationId, t.status)],
);
