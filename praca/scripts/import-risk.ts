import { readFileSync } from "node:fs";
import postgres from "postgres";
import { loadEnv } from "./_env";

loadEnv();

/**
 * Imports an official hazard layer from a GeoJSON file in EPSG:4326 (WGS 84), replacing the layer's previous features.
 *
 *   pnpm risk:import --file flood.geojson --code flood_apa --name "Inundação (APA)" --hazard flood \
 *     --source "APA, ARPSI 2.º ciclo" --source-url https://… --license "CC-BY 4.0" --as-of 2022-12-22 \
 *     --level-prop RISCO --levels "baixo=low:Baixo:1,medio=medium:Médio:2,alto=high:Elevado:3"
 *
 * `--levels` maps each value of the level property to `key:label:rank`. Features whose value is not listed are skipped and reported.
 */
function args() {
  const a = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 2) {
    const k = a[i];
    if (!k?.startsWith("--") || a[i + 1] == null) throw new Error(`Bad argument near "${k}"`);
    out[k.slice(2)] = a[i + 1]!;
  }
  return out;
}

async function main() {
  const o = args();
  for (const k of ["file", "code", "name", "hazard", "source", "level-prop", "levels"]) if (!o[k]) throw new Error(`Missing --${k}`);
  const mapping = new Map<string, { key: string; label: string; rank: number }>();
  for (const part of o.levels!.split(",")) {
    const [raw, spec] = part.split("=");
    const [key, label, rank] = (spec ?? "").split(":");
    if (!raw || !key || !label || !rank) throw new Error(`Bad --levels entry "${part}"`);
    mapping.set(raw.trim(), { key, label, rank: Number(rank) });
  }
  const gj = JSON.parse(readFileSync(o.file!, "utf8")) as { type: string; features: { geometry: { type: string }; properties: Record<string, unknown> }[] };
  if (gj.type !== "FeatureCollection") throw new Error("Expected a GeoJSON FeatureCollection");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const levels = [...new Map([...mapping.values()].map((l) => [l.key, l])).values()];
    const [layer] = await sql<{ id: string }[]>`
      INSERT INTO risk_layers (code, name, hazard, source, source_url, license, as_of, is_seed, levels)
      VALUES (${o.code!}, ${o.name!}, ${o.hazard!}, ${o.source!}, ${o["source-url"] ?? null}, ${o.license ?? null}, ${o["as-of"] ?? null}, false, ${sql.json(levels)})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, hazard = EXCLUDED.hazard, source = EXCLUDED.source, source_url = EXCLUDED.source_url,
        license = EXCLUDED.license, as_of = EXCLUDED.as_of, is_seed = false, levels = EXCLUDED.levels
      RETURNING id`;
    await sql`DELETE FROM risk_features WHERE layer_id = ${layer!.id}`;
    let n = 0;
    const skipped = new Map<string, number>();
    for (const f of gj.features) {
      const raw = String(f.properties?.[o["level-prop"]!] ?? "");
      const lv = mapping.get(raw);
      if (!lv || !/Polygon$/.test(f.geometry?.type ?? "")) {
        skipped.set(raw || "(sem valor)", (skipped.get(raw || "(sem valor)") ?? 0) + 1);
        continue;
      }
      await sql`
        INSERT INTO risk_features (layer_id, level, geom, props)
        VALUES (${layer!.id}, ${lv.key}, ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}), 4326))), ${sql.json({ [o["level-prop"]!]: raw })})`;
      n++;
    }
    console.log(`✓ ${o.code}: ${n} features imported`);
    if (skipped.size) console.log("  skipped:", Object.fromEntries(skipped));
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
