-- Things Drizzle's schema DSL cannot express.
-- geography(Point) generated from lat/lng: ST_DWithin / distance queries need geography; lat/lng stay as plain doubles for cheap reads.
ALTER TABLE "properties"
  ADD COLUMN "location" geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;--> statement-breakpoint
-- GiST: ST_DWithin / bbox queries (map, comparables, alert matching).
CREATE INDEX "properties_location_gist" ON "properties" USING gist ("location");--> statement-breakpoint
-- Geometry flavour of the same point for ST_Contains against polygons (drawn zones, parishes) without casting at query time.
CREATE INDEX "properties_geom_gist" ON "properties" USING gist ((ST_SetSRID(ST_MakePoint(lng, lat), 4326)));
