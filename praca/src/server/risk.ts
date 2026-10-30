import { sql } from "@/db";

export interface RiskAt {
  code: string;
  name: string;
  hazard: string;
  source: string;
  sourceUrl: string | null;
  license: string | null;
  asOf: string | null;
  isSeed: boolean;
  /** Level key when the point is inside a mapped zone; null when outside every mapped zone of the layer. */
  level: string | null;
  levelLabel: string | null;
}

/** Hazard layers at a point. A layer with no polygon over the point reports `level: null` (outside the mapped zones), never "no risk". */
export async function riskAt(lat: number, lng: number): Promise<RiskAt[]> {
  const rows = await sql<(Omit<RiskAt, "levelLabel" | "level" | "sourceUrl" | "asOf" | "isSeed"> & { source_url: string | null; as_of: string | null; is_seed: boolean; level: string | null; levels: { key: string; label: string; rank: number }[] })[]>`
    SELECT l.code, l.name, l.hazard, l.source, l.source_url, l.license, l.as_of::text AS as_of, l.is_seed, l.levels, hit.level
    FROM risk_layers l
    LEFT JOIN LATERAL (
      SELECT f.level FROM risk_features f
      WHERE f.layer_id = l.id AND ST_Covers(f.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      ORDER BY coalesce((SELECT (x->>'rank')::int FROM jsonb_array_elements(l.levels) x WHERE x->>'key' = f.level LIMIT 1), 0) DESC LIMIT 1
    ) hit ON true
    ORDER BY l.code`;
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    hazard: r.hazard,
    source: r.source,
    sourceUrl: r.source_url,
    license: r.license,
    asOf: r.as_of,
    isSeed: r.is_seed,
    level: r.level,
    levelLabel: r.level ? (r.levels.find((x) => x.key === r.level)?.label ?? r.level) : null,
  }));
}

export interface RiskLayerInfo {
  code: string;
  name: string;
  source: string;
  isSeed: boolean;
  levels: { key: string; label: string; rank: number }[];
}

export async function listRiskLayers(): Promise<RiskLayerInfo[]> {
  return sql<RiskLayerInfo[]>`SELECT code, name, source, is_seed AS "isSeed", levels FROM risk_layers ORDER BY code`;
}

/** GeoJSON of a layer inside a bounding box (simplified to the viewport scale), capped for safety. */
export async function riskGeoJson(code: string, bbox: [number, number, number, number]) {
  const [w, s, e, n] = bbox;
  const tol = Math.max(0.00001, (e - w) / 800);
  const rows = await sql<{ level: string; geom: string }[]>`
    SELECT f.level, ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Intersection(f.geom, ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)), ${tol}), 5) AS geom
    FROM risk_features f JOIN risk_layers l ON l.id = f.layer_id
    WHERE l.code = ${code} AND f.geom && ST_MakeEnvelope(${w}, ${s}, ${e}, ${n}, 4326)
    LIMIT 500`;
  return {
    type: "FeatureCollection" as const,
    features: rows.filter((r) => r.geom).map((r) => ({ type: "Feature" as const, properties: { level: r.level }, geometry: JSON.parse(r.geom) as unknown })),
  };
}
