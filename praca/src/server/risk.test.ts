import { afterAll, describe, expect, it } from "vitest";

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    const [r] = await c`select count(*)::int as n from listings where is_seed`;
    await c.end();
    return (r?.n ?? 0) > 100;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasDb)("risk layers (database)", () => {
  afterAll(async () => {
    const { sql } = await import("@/db");
    await sql.end();
  });

  it("reports the highest level inside a zone and null (not 'safe') outside every mapped zone", async () => {
    const { sql } = await import("@/db");
    const { seedRisk } = await import("../../scripts/seed/risk");
    await seedRisk(sql as never);
    const { riskAt, riskGeoJson, listRiskLayers } = await import("./risk");
    const inside = (await riskAt(38.7075, -9.1393)).find((r) => r.code === "flood_demo");
    expect(inside?.level).toBe("high");
    expect(inside?.isSeed).toBe(true);
    const ring = (await riskAt(38.7075 + 0.006, -9.1393)).find((r) => r.code === "flood_demo"); // ~670 m north: medium ring only
    expect(ring?.level).toBe("medium");
    const outside = (await riskAt(41.1496, -8.611)).find((r) => r.code === "flood_demo");
    expect(outside?.level).toBeNull();
    expect((await listRiskLayers()).some((l) => l.code === "flood_demo")).toBe(true);
    const gj = await riskGeoJson("flood_demo", [-9.16, 38.69, -9.11, 38.73]);
    expect(gj.features.length).toBeGreaterThan(0);
    expect(gj.features[0]!.properties.level).toMatch(/medium|high/);
  });
});
