import { afterAll, describe, expect, it } from "vitest";
import type { IneIndicator } from "@/lib/ine";

const hasDb = await (async () => {
  if (!process.env.DATABASE_URL) return false;
  try {
    const postgres = (await import("postgres")).default;
    const c = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    const [r] = await c`select count(*)::int as n from transactions`;
    await c.end();
    return r != null;
  } catch {
    return false;
  }
})();

/** Fake INE response with enough municipalities to pass the sanity floor. */
function ineBody(ppmOffset = 0): IneIndicator[] {
  const rows = Array.from({ length: 150 }, (_, i) => ({ geocod: `1A0${String(1100 + i).padStart(4, "0")}`, geodsg: `M${i}`, dim_3: "H1", valor: String(1000 + i + ppmOffset) }));
  return [{ IndicadorCod: "0014763", IndicadorDsg: "x", DataUltimoAtualizacao: "2026-10-23", Dados: { "1.º Trimestre de 2031": rows, "2.º Trimestre de 2031": [...rows, { geocod: "PT", geodsg: "Portugal", dim_3: "H1", valor: "2500" }] } }];
}
const jsonFetch = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe.skipIf(!hasDb)("official sources sync (database)", () => {
  afterAll(async () => {
    const { sql } = await import("@/db");
    const { INE_SALES } = await import("./official-sources");
    await sql`DELETE FROM transactions WHERE source = ${INE_SALES.source} AND period >= '2031-01-01'`;
    await sql`DELETE FROM rates WHERE valid_from >= '2031-01-01'`;
    await sql.end();
  });

  it("imports INE medians idempotently and leaves other sources and periods alone", async () => {
    const { sql } = await import("@/db");
    const { syncIneSales, INE_SALES } = await import("./official-sources");
    await sql`INSERT INTO transactions (geo_level, geo_code, period, median_price_per_m2, n, source, is_seed) VALUES ('municipality', '1100', '2031-01-01', 1, 0, 'outra fonte', false) ON CONFLICT DO NOTHING`;
    const a = await syncIneSales(jsonFetch(ineBody()));
    expect(a.periods).toEqual(["2031-01-01", "2031-04-01"]);
    expect(a.rows).toBe(301);
    const count = async () => (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM transactions WHERE source = ${INE_SALES.source} AND period >= '2031-01-01'`)[0]!.n;
    expect(await count()).toBe(301);
    await syncIneSales(jsonFetch(ineBody(5))); // revised values replace, not duplicate
    expect(await count()).toBe(301);
    const [v] = await sql<{ v: number }[]>`SELECT median_price_per_m2::float8 AS v FROM transactions WHERE source = ${INE_SALES.source} AND geo_code = '1100' AND period = '2031-04-01'`;
    expect(v!.v).toBe(1005);
    expect((await sql`SELECT 1 FROM transactions WHERE source = 'outra fonte' AND period = '2031-01-01'`).length).toBe(1);
    await sql`DELETE FROM transactions WHERE source = 'outra fonte' AND period = '2031-01-01'`;
  });

  it("refuses a tiny or wrong response instead of wiping good data", async () => {
    const { syncIneSales } = await import("./official-sources");
    await expect(syncIneSales(jsonFetch([{ ...ineBody()[0]!, Dados: { "2.º Trimestre de 2031": [] } }]))).rejects.toThrow(/refusing/);
    await expect(syncIneSales(jsonFetch([{ ...ineBody()[0]!, IndicadorCod: "9999999" }]))).rejects.toThrow(/Unexpected/);
    await expect(syncIneSales(jsonFetch({}, 403))).rejects.toThrow(/403/);
  });

  it("stores ECB Euribor averages as real (non-seed) rates and refreshes them", async () => {
    const { sql } = await import("@/db");
    const { syncEuribor } = await import("./official-sources");
    const csv = (v: string) => `KEY,FREQ,TIME_PERIOD,OBS_VALUE,OBS_STATUS,TITLE\nX,M,2031-03,${v},A,"t"\nX,M,2031-04,,M,"missing"`;
    const mk = (v: string) => (async () => new Response(csv(v), { status: 200 })) as unknown as typeof fetch;
    const r = await syncEuribor(mk("3.1234567"));
    expect(r.rows).toBe(3);
    const [a] = await sql<{ value: number; is_seed: boolean }[]>`SELECT value::float8, is_seed FROM rates WHERE code = 'euribor_12m' AND valid_from = '2031-03-01'`;
    expect(a).toEqual({ value: 3.1235, is_seed: false });
    await syncEuribor(mk("3.2"));
    const rows = await sql<{ value: number }[]>`SELECT value::float8 FROM rates WHERE code = 'euribor_12m' AND valid_from = '2031-03-01'`;
    expect(rows).toEqual([{ value: 3.2 }]);
  });
});
