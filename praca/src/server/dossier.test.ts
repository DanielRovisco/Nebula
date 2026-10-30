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

describe.skipIf(!hasDb)("dossier PDF (database)", () => {
  afterAll(async () => {
    const { sql } = await import("@/db");
    await sql.end();
  });

  it("builds the data for a seeded property and renders a PDF", async () => {
    const { sql } = await import("@/db");
    const { buildDossier } = await import("./dossier");
    const { renderDossierPdf } = await import("./pdf/dossier-pdf");
    const [r] = await sql<{ reference: string }[]>`
      SELECT p.reference FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.municipality_code = '1106' AND p.type = 'apartment' LIMIT 1`;
    const d = await buildDossier(r!.reference);
    expect(d).not.toBeNull();
    expect(d!.costs?.hpp.total).toBeGreaterThan(0);
    expect(d!.costs!.secondary.total).toBeGreaterThanOrEqual(d!.costs!.hpp.total);
    const pdf = await renderDossierPdf(d!);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2500);
    expect(await buildDossier("PR-999999")).toBeNull();
    expect(await buildDossier("../etc/passwd")).toBeNull();
  });
});
