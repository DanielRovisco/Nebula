CREATE TABLE "isochrone_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"geojson" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
