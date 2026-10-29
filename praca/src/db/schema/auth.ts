import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, deletedAt, pk, ts, updatedAt } from "./_helpers";

export const profileTypeEnum = pgEnum("profile_type", ["private", "agent", "agency", "investor", "developer"]);
export const userRoleEnum = pgEnum("user_role", ["user", "editor", "admin"]);
export const amiStatusEnum = pgEnum("ami_status", ["none", "pending", "verified", "rejected"]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "agent", "viewer"]);
export const planEnum = pgEnum("plan", ["free", "pro", "agency"]);

// Auth.js v5 compatible tables (users, accounts, sessions, verification_tokens) + product columns.
export const users = pgTable(
  "users",
  {
    id: pk(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("user"),
    profileType: profileTypeEnum("profile_type").notNull().default("private"),
    phone: text("phone"),
    locale: text("locale").notNull().default("pt"),
    amiNumber: text("ami_number"),
    amiStatus: amiStatusEnum("ami_status").notNull().default("none"),
    verifiedAdvertiser: boolean("verified_advertiser").notNull().default(false),
    onboardedAt: ts("onboarded_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    // Case-insensitive unique email: login lookups and enumeration-safe upserts.
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("accounts_user_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const organizations = pgTable(
  "organizations",
  {
    id: pk(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind").notNull().default("agency"), // agency | developer | bank | other
    amiLicense: text("ami_license"),
    nif: text("nif"),
    logoUrl: text("logo_url"),
    brandColor: text("brand_color"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    verified: boolean("verified").notNull().default(false),
    plan: planEnum("plan").notNull().default("free"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex("organizations_slug_uq").on(t.slug)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: pk(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("agent"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("memberships_org_user_uq").on(t.organizationId, t.userId), index("memberships_user_idx").on(t.userId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: pk(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull(),
    status: text("status").notNull(), // trialing | active | past_due | canceled | incomplete
    interval: text("interval"), // month | year
    seats: integer("seats").notNull().default(1),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    trialEndsAt: ts("trial_ends_at"),
    currentPeriodEnd: ts("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_sub_uq").on(t.stripeSubscriptionId),
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_org_idx").on(t.organizationId),
  ],
);

/** Quotas per plan, editable without a deploy. `limit_value` null = unlimited. */
export const entitlements = pgTable(
  "entitlements",
  {
    id: pk(),
    plan: planEnum("plan").notNull(),
    feature: text("feature").notNull(), // alerts | valuations | exports | api_calls | seats | crm | fsbo | pdf_reports
    limitValue: integer("limit_value"),
    enabled: boolean("enabled").notNull().default(true),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("entitlements_plan_feature_uq").on(t.plan, t.feature)],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: pk(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(), // first chars shown in UI
    keyHash: text("key_hash").notNull(), // sha-256 of the secret; the secret itself is shown once
    scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
    lastUsedAt: ts("last_used_at"),
    revokedAt: ts("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_keys_hash_uq").on(t.keyHash)],
);

export const consents = pgTable(
  "consents",
  {
    id: pk(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    anonymousId: text("anonymous_id"),
    purpose: text("purpose").notNull(), // cookies_analytics | cookies_marketing | newsletter | terms | contact_agent ...
    granted: boolean("granted").notNull(),
    policyVersion: text("policy_version").notNull(),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("consents_user_idx").on(t.userId), index("consents_anon_idx").on(t.anonymousId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: pk(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_actor_idx").on(t.actorId, t.createdAt), index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
