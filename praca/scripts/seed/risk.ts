import type postgres from "postgres";

/**
 * Illustrative hazard layer for local demos only (is_seed = true). The polygons are circles around a few Lisbon waterfront
 * points; they are NOT official flood zones. Real layers come from `pnpm risk:import` (see docs/RISK_LAYERS.md).
 */
export async function seedRisk(sql: postgres.Sql) {
  await sql`DELETE FROM risk_layers WHERE is_seed`;
  const [layer] = await sql<{ id: string }[]>`
    INSERT INTO risk_layers (code, name, hazard, source, source_url, license, as_of, is_seed, levels)
    VALUES ('flood_demo', 'Inundação (zonas ilustrativas)', 'flood', 'Demonstração Praça, não oficial', NULL, NULL, NULL, true,
            ${sql.json([{ key: "medium", label: "Médio", rank: 2 }, { key: "high", label: "Elevado", rank: 3 }])})
    RETURNING id`;
  const pts: [number, number][] = [[-9.1393, 38.7075], [-9.1180, 38.7135], [-9.1650, 38.6960]];
  for (const [lng, lat] of pts) {
    for (const [level, metres] of [["medium", 900], ["high", 450]] as const) {
      await sql`
        INSERT INTO risk_features (layer_id, level, geom, props)
        VALUES (${layer!.id}, ${level}, ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${metres})::geometry), '{"demo":true}'::jsonb)`;
    }
  }
}
