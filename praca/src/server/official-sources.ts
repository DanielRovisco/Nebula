import { sql } from "@/db";
import { parseEcbCsv, parseSalesMedians, type IneIndicator } from "@/lib/ine";

type Fetch = typeof fetch;

/** INE indicator 0014763: median sale value per m² of family dwellings, last 12 months, by NUTS 2024 location (quarterly, CC BY 4.0). */
export const INE_SALES = { varcd: "0014763", source: "INE, Estatísticas de preços da habitação ao nível local: valor mediano das vendas por m² (últimos 12 meses), CC BY 4.0" };

// Identifies us honestly; INE's firewall resets connections from user agents that do not follow the usual "Mozilla/5.0 (compatible; …)" shape.
const UA = { "user-agent": "Mozilla/5.0 (compatible; PracaBot/1.0; +https://praca.example/metodologia)" };

export interface SyncResult {
  ine: { rows: number; periods: string[] };
  euribor: { rows: number; latest: Record<string, string> };
}

/**
 * Registered sales medians from INE → `transactions` (real transaction prices, never mixed with asking prices).
 * Idempotent: each (source, period) is replaced. Every run picks up newly published quarters, so the series grows over time.
 */
export async function syncIneSales(doFetch: Fetch = fetch): Promise<SyncResult["ine"]> {
  const res = await doFetch(`https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=${INE_SALES.varcd}&Dim1=T&lang=PT`, { headers: UA, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`INE responded ${res.status}`);
  const data = ((await res.json()) as IneIndicator[])[0];
  if (!data || data.IndicadorCod !== INE_SALES.varcd) throw new Error("Unexpected INE response");
  const pts = parseSalesMedians(data);
  if (pts.length < 100) throw new Error(`INE returned only ${pts.length} usable rows; refusing to replace data`);
  const periods = [...new Set(pts.map((p) => p.period))].sort();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM transactions WHERE source = ${INE_SALES.source} AND period = ANY(${tx.array(periods)}::date[])`;
    for (let i = 0; i < pts.length; i += 500) {
      const rows = pts.slice(i, i + 500).map((p) => ({ geo_level: p.geoLevel, geo_code: p.geoCode, period: p.period, median_price_per_m2: p.ppm, n: 0, source: INE_SALES.source, is_seed: false }));
      await tx`INSERT INTO transactions ${tx(rows, "geo_level", "geo_code", "period", "median_price_per_m2", "n", "source", "is_seed")}`;
    }
  });
  return { rows: pts.length, periods };
}

const EURIBOR: [string, string][] = [["euribor_3m", "EURIBOR3MD_"], ["euribor_6m", "EURIBOR6MD_"], ["euribor_12m", "EURIBOR1YD_"]];
export const EURIBOR_SOURCE = "BCE (ECB Data Portal), Euribor, média mensal das observações diárias";

/** Monthly Euribor averages from the ECB Data Portal → `rates`. The last 6 months are refreshed on every run. */
export async function syncEuribor(doFetch: Fetch = fetch): Promise<SyncResult["euribor"]> {
  let rows = 0;
  const latest: Record<string, string> = {};
  for (const [code, series] of EURIBOR) {
    const res = await doFetch(`https://data-api.ecb.europa.eu/service/data/FM/M.U2.EUR.RT.MM.${series}.HSTA?lastNObservations=6&format=csvdata`, { headers: UA, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`ECB responded ${res.status} for ${series}`);
    const obs = parseEcbCsv(await res.text());
    if (!obs.length) throw new Error(`ECB returned no observations for ${series}`);
    for (const o of obs) {
      await sql`
        INSERT INTO rates (code, valid_from, value, source, is_seed) VALUES (${code}, ${o.month}, ${Math.round(o.value * 1e4) / 1e4}, ${EURIBOR_SOURCE}, false)
        ON CONFLICT (code, valid_from) DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source, is_seed = false`;
      rows++;
    }
    latest[code] = obs[obs.length - 1]!.month;
  }
  return { rows, latest };
}

export async function syncOfficialSources(doFetch: Fetch = fetch): Promise<{ ine?: SyncResult["ine"]; euribor?: SyncResult["euribor"]; errors: string[] }> {
  const errors: string[] = [];
  const out: { ine?: SyncResult["ine"]; euribor?: SyncResult["euribor"] } = {};
  try {
    out.ine = await syncIneSales(doFetch);
  } catch (e) {
    errors.push(`ine: ${(e as Error).message}`);
  }
  try {
    out.euribor = await syncEuribor(doFetch);
  } catch (e) {
    errors.push(`euribor: ${(e as Error).message}`);
  }
  return { ...out, errors };
}
