import { readFileSync } from "node:fs";
import { join } from "node:path";
import type postgres from "postgres";
import { slugify } from "../../src/lib/slug";

interface GeoMunicipality {
  code: string;
  name: string;
  districtCode: string;
  districtName: string;
  centroid: [number, number];
  areaHa: number;
  geometry: unknown;
}
interface GeoParish {
  code: string;
  name: string;
  municipalityCode: string;
  centroid: [number, number];
  areaHa: number;
  geometry: unknown;
}

const read = <T>(f: string): T => JSON.parse(readFileSync(join(process.cwd(), "data/geo", f), "utf8")) as T;

/** Loads the committed CAOP snapshot (data/geo). Idempotent: upserts by code. */
export async function seedGeo(sql: postgres.Sql) {
  const municipalities = read<GeoMunicipality[]>("municipalities.json");
  const parishes = read<GeoParish[]>("parishes.json");
  const districts = read<{ code: string; name: string }[]>("districts.json");

  await sql.begin(async (tx) => {
    for (const d of districts) {
      await tx`INSERT INTO geo_districts (code, name, slug, lat, lng)
               VALUES (${d.code}, ${d.name}, ${slugify(d.name)}, 0, 0)
               ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`;
    }
    for (const m of municipalities) {
      await tx`INSERT INTO geo_municipalities (code, district_code, name, slug, lat, lng, area_ha, geom)
               VALUES (${m.code}, ${m.districtCode}, ${m.name}, ${slugify(m.name)}, ${m.centroid[1]}, ${m.centroid[0]}, ${m.areaHa},
                       ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(m.geometry)}), 4326)), 3)))
               ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
                 area_ha = EXCLUDED.area_ha, geom = EXCLUDED.geom`;
    }
    const seen = new Map<string, number>();
    for (const p of parishes) {
      let slug = slugify(p.name);
      const k = `${p.municipalityCode}/${slug}`;
      if (seen.has(k)) slug = `${slug}-${p.code}`;
      seen.set(k, 1);
      await tx`INSERT INTO geo_parishes (code, municipality_code, name, slug, lat, lng, area_ha, geom)
               VALUES (${p.code}, ${p.municipalityCode}, ${p.name}, ${slug}, ${p.centroid[1]}, ${p.centroid[0]}, ${p.areaHa},
                       ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(p.geometry)}), 4326)), 3)))
               ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
                 area_ha = EXCLUDED.area_ha, geom = EXCLUDED.geom`;
    }
    // Districts have no own polygon in the snapshot: union of their municipalities (also valid for the island regions).
    await tx`UPDATE geo_districts d SET
               geom = u.g,
               lat = ST_Y(ST_PointOnSurface(u.g)),
               lng = ST_X(ST_PointOnSurface(u.g))
             FROM (SELECT district_code, ST_Multi(ST_UnaryUnion(ST_Collect(geom))) AS g FROM geo_municipalities GROUP BY district_code) u
             WHERE u.district_code = d.code`;
  });
  return { districts: districts.length, municipalities: municipalities.length, parishes: parishes.length };
}

export interface ParishRef {
  code: string;
  name: string;
  municipalityCode: string;
  municipalityName: string;
  districtCode: string;
  areaHa: number;
  centroid: [number, number];
  /** Polygons as [lng,lat] rings, for point sampling. */
  polygons: [number, number][][][];
  bbox: [number, number, number, number];
}

/** Loads parish geometry into memory for sampling random points inside parishes. */
export function loadParishRefs(): ParishRef[] {
  const municipalities = read<GeoMunicipality[]>("municipalities.json");
  const parishes = read<GeoParish[]>("parishes.json");
  const mun = new Map(municipalities.map((m) => [m.code, m]));
  return parishes.map((p) => {
    const g = p.geometry as { type: string; coordinates: unknown };
    const polygons = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as [number, number][][][];
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    for (const poly of polygons) for (const [x, y] of poly[0]!) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const m = mun.get(p.municipalityCode)!;
    return {
      code: p.code,
      name: p.name,
      municipalityCode: p.municipalityCode,
      municipalityName: m.name,
      districtCode: m.districtCode,
      areaHa: p.areaHa,
      centroid: p.centroid,
      polygons,
      bbox: [minX, minY, maxX, maxY],
    };
  });
}
