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

// Integration: needs the seeded database.
describe.skipIf(!hasDb)("AVM + PDF (database)", () => {
  afterAll(async () => {
    const { sql } = await import("@/db");
    await sql.end();
  });

  it("values a Lisbon T2 with comparables, interval, confidence and rent", async () => {
    const { runValuation } = await import("./avm");
    const o = await runValuation({ lat: 38.7369, lng: -9.1427, type: "apartment", typology: 2, area: 80, yearBuilt: 2005, condition: "used", floor: 3, elevator: true });
    expect(o.sale).not.toBeNull();
    const s = o.sale!;
    expect(s.n).toBeGreaterThanOrEqual(5);
    expect(s.low).toBeLessThanOrEqual(s.value);
    expect(s.high).toBeGreaterThanOrEqual(s.value);
    expect(s.pricePerM2).toBeGreaterThan(3000); // Lisbon seed prices are ~5 000 €/m²
    expect(s.pricePerM2).toBeLessThan(9000);
    expect(s.comparables[0]!.similarity).toBeGreaterThan(0.3);
    expect(s.comparables.every((c, i, a) => i === 0 || a[i - 1]!.similarity >= c.similarity)).toBe(true);
  });

  it("returns no estimate in the middle of nowhere", async () => {
    const { runValuation } = await import("./avm");
    const o = await runValuation({ lat: 39.0, lng: -30.0, type: "apartment", typology: 2, area: 80 });
    expect(o.sale).toBeNull();
  });

  it("renders a branded PDF", async () => {
    const { runValuation } = await import("./avm");
    const { renderValuationPdf } = await import("./pdf/valuation-pdf");
    const outcome = await runValuation({ lat: 38.7369, lng: -9.1427, type: "apartment", typology: 2, area: 80 });
    const pdf = await renderValuationPdf({
      id: "x", title: "t", createdAt: new Date(), updatedAt: new Date(), userId: null, organizationId: null, outcome,
      agent: { name: "Ana Mediadora", email: "ana@example.com", amiNumber: "12345", amiStatus: "verified" },
      brand: { name: "Agência Demo", logoUrl: null, color: "#0a7a5a", email: "geral@example.com", phone: "+351 210 000 000", website: null },
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3000);
  });
});
