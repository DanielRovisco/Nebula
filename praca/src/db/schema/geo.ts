import { sql } from "drizzle-orm";
import { doublePrecision, index, integer, pgTable, text, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createdAt, multiPolygon, pk, updatedAt } from "./_helpers";

// Source: CAOP / Direção-Geral do Território, via snapshot in data/geo (see docs/DATA_SOURCES.md).
// Slugs are URL-stable and unique within their parent.

export const geoDistricts = pgTable(
  "geo_districts",
  {
    code: text("code").primaryKey(), // 2-digit DICO prefix; "31" Madeira, "40" Açores
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    geom: multiPolygon("geom"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("geo_districts_slug_uq").on(t.slug),
    // GiST: point-in-polygon & bbox filters for map queries.
    index("geo_districts_geom_gist").using("gist", t.geom),
  ],
);

export const geoMunicipalities = pgTable(
  "geo_municipalities",
  {
    code: text("code").primaryKey(), // 4-digit DICO
    districtCode: text("district_code").notNull().references(() => geoDistricts.code),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    nameSearch: text("name_search").generatedAlwaysAs(sql`lower(immutable_unaccent(name))`),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    areaHa: doublePrecision("area_ha"),
    geom: multiPolygon("geom"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("geo_municipalities_slug_uq").on(t.districtCode, t.slug),
    index("geo_municipalities_district_idx").on(t.districtCode),
    index("geo_municipalities_geom_gist").using("gist", t.geom),
    // GIN trigram: fuzzy autocomplete on unaccented names.
    index("geo_municipalities_name_trgm").using("gin", t.nameSearch.op("gin_trgm_ops")),
  ],
);

export const geoParishes = pgTable(
  "geo_parishes",
  {
    code: text("code").primaryKey(), // 6-digit DICOFRE
    municipalityCode: text("municipality_code").notNull().references(() => geoMunicipalities.code),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    nameSearch: text("name_search").generatedAlwaysAs(sql`lower(immutable_unaccent(name))`),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    areaHa: doublePrecision("area_ha"),
    geom: multiPolygon("geom"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("geo_parishes_slug_uq").on(t.municipalityCode, t.slug),
    index("geo_parishes_municipality_idx").on(t.municipalityCode),
    index("geo_parishes_geom_gist").using("gist", t.geom),
    index("geo_parishes_name_trgm").using("gin", t.nameSearch.op("gin_trgm_ops")),
  ],
);

export const geoPostcodes = pgTable(
  "geo_postcodes",
  {
    id: pk(),
    code: text("code").notNull(), // "1000-001"
    parishCode: text("parish_code").references(() => geoParishes.code),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    arteria: text("arteria"),
    isSeed: boolean("is_seed").notNull().default(false),
    n: integer("n").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("geo_postcodes_code_uq").on(t.code), index("geo_postcodes_code_trgm").using("gin", t.code.op("gin_trgm_ops"))],
);
