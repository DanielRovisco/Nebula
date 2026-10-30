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

describe.skipIf(!hasDb)("fair price (database)", () => {
  afterAll(async () => {
    const { sql } = await import("@/db");
    await sql.end();
  });

  it("never uses the advert itself as a comparable and returns a verdict for a dense zone", async () => {
    const { sql } = await import("@/db");
    const { getPropertyByReference } = await import("./properties");
    const { runValuation } = await import("./avm");
    const { getFairPrice } = await import("./fair-price");
    const rows = await sql<{ reference: string }[]>`
      SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id
      WHERE l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.type = 'apartment' AND p.municipality_code = '1106' AND p.usable_area > 40 LIMIT 15`;
    let verdicts = 0;
    for (const r of rows) {
      const p = await getPropertyByReference(r.reference);
      if (!p) continue;
      const out = await runValuation(
        { lat: p.lat, lng: p.lng, type: "apartment", typology: p.typology ?? undefined, area: p.usableArea!, floor: p.floor ?? undefined, elevator: p.elevator },
        { excludeListingId: p.primary.id, only: "sale" },
      );
      expect(out.rent).toBeNull();
      expect(out.sale?.comparables.some((c) => c.id === p.primary.id) ?? false).toBe(false);
      const fair = await getFairPrice(p);
      if (fair) {
        verdicts++;
        expect(["below", "fair", "above"]).toContain(fair.verdict);
        expect(fair.n).toBeGreaterThanOrEqual(8);
      }
    }
    expect(verdicts).toBeGreaterThan(0);
  });
});
