CREATE TABLE "fraud_signals" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"code" text NOT NULL,
	"severity" integer NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"listing_id" uuid NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_features" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"layer_id" uuid NOT NULL,
	"level" text NOT NULL,
	"geom" geometry(MultiPolygon,4326) NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_layers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"hazard" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"license" text,
	"as_of" date,
	"is_seed" boolean DEFAULT false NOT NULL,
	"levels" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_verifications" ADD CONSTRAINT "listing_verifications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_verifications" ADD CONSTRAINT "listing_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_features" ADD CONSTRAINT "risk_features_layer_id_risk_layers_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."risk_layers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fraud_signals_uq" ON "fraud_signals" USING btree ("listing_id","code");--> statement-breakpoint
CREATE INDEX "fraud_signals_listing_idx" ON "fraud_signals" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_verifications_listing_idx" ON "listing_verifications" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "risk_features_layer_idx" ON "risk_features" USING btree ("layer_id");--> statement-breakpoint
CREATE INDEX "risk_features_geom_gist" ON "risk_features" USING gist ("geom");--> statement-breakpoint
CREATE UNIQUE INDEX "risk_layers_code_uq" ON "risk_layers" USING btree ("code");