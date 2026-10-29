CREATE TYPE "public"."ami_status" AS ENUM('none', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'agent', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'agency');--> statement-breakpoint
CREATE TYPE "public"."profile_type" AS ENUM('private', 'agent', 'agency', 'investor', 'developer');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."advertiser_type" AS ENUM('private', 'professional');--> statement-breakpoint
CREATE TYPE "public"."business" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."property_condition" AS ENUM('new', 'used', 'to_renovate', 'under_construction');--> statement-breakpoint
CREATE TYPE "public"."energy_class" AS ENUM('A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F', 'exempt');--> statement-breakpoint
CREATE TYPE "public"."geo_precision" AS ENUM('exact', 'street', 'parish');--> statement-breakpoint
CREATE TYPE "public"."listing_event_type" AS ENUM('published', 'price_drop', 'price_rise', 'withdrawn', 'returned', 'sold', 'rented', 'merged');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'withdrawn', 'sold', 'rented', 'expired', 'pending_review');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'land', 'shop', 'office', 'warehouse', 'garage', 'building');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('csv', 'xml_feed', 'json_api', 'open_data', 'seed', 'partner', 'manual');--> statement-breakpoint
CREATE TYPE "public"."geo_level" AS ENUM('country', 'district', 'municipality', 'parish');--> statement-breakpoint
CREATE TYPE "public"."alert_frequency" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."alert_trigger" AS ENUM('new_listing', 'price_drop', 'back_on_market', 'sold_or_withdrawn');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"actor_id" uuid,
	"organization_id" uuid,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"meta" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" text NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"plan" "plan" NOT NULL,
	"feature" text NOT NULL,
	"limit_value" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'agency' NOT NULL,
	"ami_license" text,
	"nif" text,
	"logo_url" text,
	"brand_color" text,
	"website" text,
	"email" text,
	"phone" text,
	"verified" boolean DEFAULT false NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"plan" "plan" NOT NULL,
	"status" text NOT NULL,
	"interval" text,
	"seats" integer DEFAULT 1 NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_ends_at" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"profile_type" "profile_type" DEFAULT 'private' NOT NULL,
	"phone" text,
	"locale" text DEFAULT 'pt' NOT NULL,
	"ami_number" text,
	"ami_status" "ami_status" DEFAULT 'none' NOT NULL,
	"verified_advertiser" boolean DEFAULT false NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "geo_districts" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"geom" geometry(MultiPolygon,4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_municipalities" (
	"code" text PRIMARY KEY NOT NULL,
	"district_code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"name_search" text GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"area_ha" double precision,
	"geom" geometry(MultiPolygon,4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_parishes" (
	"code" text PRIMARY KEY NOT NULL,
	"municipality_code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"name_search" text GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"area_ha" double precision,
	"geom" geometry(MultiPolygon,4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_postcodes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" text NOT NULL,
	"parish_code" text,
	"lat" double precision,
	"lng" double precision,
	"arteria" text,
	"is_seed" boolean DEFAULT false NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dedupe_candidates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"candidate_property_id" uuid NOT NULL,
	"score" numeric(4, 3) NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_errors" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"run_id" uuid NOT NULL,
	"external_id" text,
	"stage" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"received" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"merged" integer DEFAULT 0 NOT NULL,
	"rejected" integer DEFAULT 0 NOT NULL,
	"triggered_by" uuid
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_events" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"type" "listing_event_type" NOT NULL,
	"from_price" numeric(12, 2),
	"to_price" numeric(12, 2),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listing_media" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"kind" text DEFAULT 'image' NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"blur_data_url" text,
	"phash" text,
	"position" smallint DEFAULT 0 NOT NULL,
	"alt" text,
	"is_illustrative" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_price_history" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"property_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"business" "business" NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"initial_price" numeric(12, 2) NOT NULL,
	"price_per_m2" numeric(10, 2),
	"price_drop_pct" numeric(5, 2) DEFAULT 0 NOT NULL,
	"last_price_change_at" timestamp with time zone,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"advertiser_type" "advertiser_type" NOT NULL,
	"advertiser_name" text,
	"agency_id" uuid,
	"owner_user_id" uuid,
	"contact_phone" text,
	"contact_email" text,
	"url" text,
	"title" text NOT NULL,
	"description" text,
	"video_url" text,
	"tour_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"verified" boolean DEFAULT false NOT NULL,
	"fraud_score" smallint DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"reference" text NOT NULL,
	"fingerprint" text NOT NULL,
	"type" "property_type" NOT NULL,
	"typology" smallint,
	"bedrooms" smallint,
	"bathrooms" smallint,
	"usable_area" numeric(10, 2),
	"gross_area" numeric(10, 2),
	"plot_area" numeric(12, 2),
	"year_built" smallint,
	"floor" smallint,
	"total_floors" smallint,
	"condition" "property_condition",
	"energy_class" "energy_class",
	"parking_spaces" smallint DEFAULT 0 NOT NULL,
	"elevator" boolean DEFAULT false NOT NULL,
	"balcony" boolean DEFAULT false NOT NULL,
	"terrace" boolean DEFAULT false NOT NULL,
	"pool" boolean DEFAULT false NOT NULL,
	"garden" boolean DEFAULT false NOT NULL,
	"view" text,
	"furnished" boolean,
	"pets_allowed" boolean,
	"tenanted" boolean DEFAULT false NOT NULL,
	"address" text,
	"postal_code" text,
	"district_code" text,
	"municipality_code" text,
	"parish_code" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"geo_precision" "geo_precision" DEFAULT 'exact' NOT NULL,
	"cadastral_ref" text,
	"dedupe_confidence" numeric(4, 3),
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"licence" text NOT NULL,
	"licence_url" text,
	"organization_id" uuid,
	"endpoint" text,
	"format" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"frequency_minutes" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text NOT NULL,
	"author_id" uuid,
	"cover_url" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"locale" text DEFAULT 'pt' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "development_units" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"development_id" uuid NOT NULL,
	"typology" smallint,
	"area" numeric(8, 2),
	"price" numeric(12, 2),
	"status" text DEFAULT 'available' NOT NULL,
	"floor" smallint
);
--> statement-breakpoint
CREATE TABLE "fiscal_tables" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tax" text NOT NULL,
	"scope" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"brackets" jsonb NOT NULL,
	"source_note" text NOT NULL,
	"verified_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_indicators" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"geo_level" "geo_level" NOT NULL,
	"geo_code" text NOT NULL,
	"business" "business" NOT NULL,
	"property_type" "property_type",
	"typology" smallint,
	"period" date NOT NULL,
	"median_price_per_m2" numeric(10, 2),
	"p25_price_per_m2" numeric(10, 2),
	"p75_price_per_m2" numeric(10, 2),
	"median_price" numeric(12, 2),
	"n" integer NOT NULL,
	"yoy_change" numeric(6, 4),
	"qoq_change" numeric(6, 4),
	"gross_yield" numeric(6, 4),
	"median_days_on_market" integer,
	"avg_asking_discount" numeric(6, 4),
	"aggregated_from" "geo_level",
	"source" text DEFAULT 'computed' NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "new_developments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"developer" text NOT NULL,
	"phase" text NOT NULL,
	"municipality_code" text,
	"parish_code" text,
	"lat" numeric,
	"lng" numeric,
	"total_units" integer,
	"available_units" integer,
	"expected_delivery" date,
	"price_from" numeric(12, 2),
	"description" text,
	"website" text,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"email" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"token" text NOT NULL,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" text NOT NULL,
	"valid_from" date NOT NULL,
	"value" numeric(7, 4) NOT NULL,
	"source" text NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"geo_level" "geo_level" NOT NULL,
	"geo_code" text NOT NULL,
	"property_type" "property_type",
	"typology" smallint,
	"period" date NOT NULL,
	"median_price_per_m2" numeric(10, 2) NOT NULL,
	"n" integer NOT NULL,
	"source" text NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"alert_id" uuid NOT NULL,
	"listing_event_id" uuid,
	"listing_id" uuid,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"saved_search_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"frequency" "alert_frequency" DEFAULT 'daily' NOT NULL,
	"triggers" "alert_trigger"[] DEFAULT ARRAY['new_listing','price_drop']::alert_trigger[] NOT NULL,
	"channels" text[] DEFAULT ARRAY['email']::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_shares" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid,
	"owner_org_id" uuid NOT NULL,
	"partner_org_id" uuid,
	"partner_email" text,
	"split_pct" numeric(5, 2) NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparisons" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid,
	"property_ids" uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"owner_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"kind" text DEFAULT 'lead' NOT NULL,
	"source" text,
	"legal_basis" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"property_id" uuid,
	"owner_id" uuid,
	"stage" text DEFAULT 'new' NOT NULL,
	"value" numeric(12, 2),
	"commission_pct" numeric(5, 2),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"contact_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"contact_id" uuid,
	"assignee_id" uuid,
	"title" text NOT NULL,
	"due_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_folders" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"folder_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_views" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"areas" geometry(MultiPolygon,4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "smartlinks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" text NOT NULL,
	"valuation_id" uuid NOT NULL,
	"organization_id" uuid,
	"refresh_daily" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_comparables" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"valuation_id" uuid NOT NULL,
	"listing_id" uuid,
	"kind" text NOT NULL,
	"similarity" numeric(4, 3) NOT NULL,
	"adjusted_price" numeric(12, 2),
	"adjustments" jsonb
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"property_id" uuid,
	"input" jsonb NOT NULL,
	"estimate" numeric(12, 2),
	"low" numeric(12, 2),
	"high" numeric(12, 2),
	"confidence" numeric(4, 3),
	"method" text DEFAULT 'weighted_median_v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_municipalities" ADD CONSTRAINT "geo_municipalities_district_code_geo_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."geo_districts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_parishes" ADD CONSTRAINT "geo_parishes_municipality_code_geo_municipalities_code_fk" FOREIGN KEY ("municipality_code") REFERENCES "public"."geo_municipalities"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_postcodes" ADD CONSTRAINT "geo_postcodes_parish_code_geo_parishes_code_fk" FOREIGN KEY ("parish_code") REFERENCES "public"."geo_parishes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedupe_candidates" ADD CONSTRAINT "dedupe_candidates_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedupe_candidates" ADD CONSTRAINT "dedupe_candidates_candidate_property_id_properties_id_fk" FOREIGN KEY ("candidate_property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedupe_candidates" ADD CONSTRAINT "dedupe_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_errors" ADD CONSTRAINT "ingestion_errors_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_price_history" ADD CONSTRAINT "listing_price_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_agency_id_organizations_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_units" ADD CONSTRAINT "development_units_development_id_new_developments_id_fk" FOREIGN KEY ("development_id") REFERENCES "public"."new_developments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_shares" ADD CONSTRAINT "commission_shares_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_shares" ADD CONSTRAINT "commission_shares_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_shares" ADD CONSTRAINT "commission_shares_partner_org_id_organizations_id_fk" FOREIGN KEY ("partner_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_folders" ADD CONSTRAINT "favorite_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_folder_id_favorite_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."favorite_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartlinks" ADD CONSTRAINT "smartlinks_valuation_id_valuations_id_fk" FOREIGN KEY ("valuation_id") REFERENCES "public"."valuations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartlinks" ADD CONSTRAINT "smartlinks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuation_comparables" ADD CONSTRAINT "valuation_comparables_valuation_id_valuations_id_fk" FOREIGN KEY ("valuation_id") REFERENCES "public"."valuations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuation_comparables" ADD CONSTRAINT "valuation_comparables_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_uq" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consents_anon_idx" ON "consents" USING btree ("anonymous_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_plan_feature_uq" ON "entitlements" USING btree ("plan","feature");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_uq" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uq" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_stripe_sub_uq" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "geo_districts_slug_uq" ON "geo_districts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "geo_districts_geom_gist" ON "geo_districts" USING gist ("geom");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_municipalities_slug_uq" ON "geo_municipalities" USING btree ("district_code","slug");--> statement-breakpoint
CREATE INDEX "geo_municipalities_district_idx" ON "geo_municipalities" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "geo_municipalities_geom_gist" ON "geo_municipalities" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "geo_municipalities_name_trgm" ON "geo_municipalities" USING gin ("name_search" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "geo_parishes_slug_uq" ON "geo_parishes" USING btree ("municipality_code","slug");--> statement-breakpoint
CREATE INDEX "geo_parishes_municipality_idx" ON "geo_parishes" USING btree ("municipality_code");--> statement-breakpoint
CREATE INDEX "geo_parishes_geom_gist" ON "geo_parishes" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "geo_parishes_name_trgm" ON "geo_parishes" USING gin ("name_search" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "geo_postcodes_code_uq" ON "geo_postcodes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "geo_postcodes_code_trgm" ON "geo_postcodes" USING gin ("code" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "dedupe_candidates_pending_idx" ON "dedupe_candidates" USING btree ("score" DESC NULLS LAST) WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "dedupe_candidates_pair_uq" ON "dedupe_candidates" USING btree ("listing_id","candidate_property_id");--> statement-breakpoint
CREATE INDEX "ingestion_errors_run_idx" ON "ingestion_errors" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ingestion_runs_source_idx" ON "ingestion_runs" USING btree ("source_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_listing_idx" ON "inquiries" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "listing_events_listing_idx" ON "listing_events" USING btree ("listing_id","occurred_at");--> statement-breakpoint
CREATE INDEX "listing_events_property_idx" ON "listing_events" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "listing_events_pending_idx" ON "listing_events" USING btree ("occurred_at") WHERE processed_at IS NULL;--> statement-breakpoint
CREATE INDEX "listing_media_listing_idx" ON "listing_media" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "listing_media_phash_idx" ON "listing_media" USING btree ("phash");--> statement-breakpoint
CREATE INDEX "listing_price_history_idx" ON "listing_price_history" USING btree ("listing_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_source_external_uq" ON "listings" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "listings_property_idx" ON "listings" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "listings_search_price_idx" ON "listings" USING btree ("business","price") WHERE status = 'active' AND is_primary;--> statement-breakpoint
CREATE INDEX "listings_search_date_idx" ON "listings" USING btree ("business","published_at" DESC NULLS LAST) WHERE status = 'active' AND is_primary;--> statement-breakpoint
CREATE INDEX "listings_search_drop_idx" ON "listings" USING btree ("business","price_drop_pct" DESC NULLS LAST) WHERE status = 'active' AND is_primary;--> statement-breakpoint
CREATE INDEX "listings_agency_idx" ON "listings" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "listings_search_fts" ON "listings" USING gin ("search");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_reference_uq" ON "properties" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "properties_fingerprint_idx" ON "properties" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "properties_muni_type_idx" ON "properties" USING btree ("municipality_code","type");--> statement-breakpoint
CREATE INDEX "properties_parish_idx" ON "properties" USING btree ("parish_code");--> statement-breakpoint
CREATE INDEX "properties_district_idx" ON "properties" USING btree ("district_code");--> statement-breakpoint
CREATE INDEX "properties_postal_idx" ON "properties" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "properties_address_trgm" ON "properties" USING gin ("address" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "sources_slug_uq" ON "sources" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_uq" ON "articles" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "development_units_dev_idx" ON "development_units" USING btree ("development_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscal_tables_uq" ON "fiscal_tables" USING btree ("tax","scope","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "market_indicators_uq" ON "market_indicators" USING btree ("geo_level","geo_code","business",coalesce(enum_text("property_type"), '*'),coalesce("typology", -1),"period");--> statement-breakpoint
CREATE INDEX "market_indicators_lookup_idx" ON "market_indicators" USING btree ("geo_level","geo_code","business","period" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "new_developments_slug_uq" ON "new_developments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "new_developments_muni_idx" ON "new_developments" USING btree ("municipality_code");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_uq" ON "newsletter_subscribers" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "rates_uq" ON "rates" USING btree ("code","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_uq" ON "transactions" USING btree ("geo_level","geo_code",coalesce(enum_text("property_type"), '*'),coalesce("typology", -1),"period","source");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_deliveries_uq" ON "alert_deliveries" USING btree ("alert_id","listing_event_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_unsub_uq" ON "alerts" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "alerts_active_idx" ON "alerts" USING btree ("frequency") WHERE active;--> statement-breakpoint
CREATE INDEX "commission_shares_owner_idx" ON "commission_shares" USING btree ("owner_org_id");--> statement-breakpoint
CREATE INDEX "commission_shares_partner_idx" ON "commission_shares" USING btree ("partner_org_id");--> statement-breakpoint
CREATE INDEX "comparisons_user_idx" ON "comparisons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_org_idx" ON "crm_contacts" USING btree ("organization_id","kind");--> statement-breakpoint
CREATE INDEX "crm_deals_org_stage_idx" ON "crm_deals" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE INDEX "crm_notes_org_idx" ON "crm_notes" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_tasks_org_idx" ON "crm_tasks" USING btree ("organization_id","due_at");--> statement-breakpoint
CREATE INDEX "favorite_folders_user_idx" ON "favorite_folders" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_property_uq" ON "favorites" USING btree ("user_id","property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_views_uq" ON "property_views" USING btree ("user_id","property_id");--> statement-breakpoint
CREATE INDEX "property_views_recent_idx" ON "property_views" USING btree ("user_id","viewed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_searches_areas_gist" ON "saved_searches" USING gist ("areas");--> statement-breakpoint
CREATE UNIQUE INDEX "smartlinks_slug_uq" ON "smartlinks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "valuation_comparables_idx" ON "valuation_comparables" USING btree ("valuation_id");--> statement-breakpoint
CREATE INDEX "valuations_user_idx" ON "valuations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "valuations_org_idx" ON "valuations" USING btree ("organization_id");