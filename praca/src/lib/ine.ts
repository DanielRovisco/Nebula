/**
 * Parsing of INE (Instituto Nacional de Estatística) indicator JSON. Pure functions, no I/O.
 * Source: https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=<code>&Dim1=T&lang=PT (licence CC BY 4.0).
 */
export interface IneRow {
  geocod: string;
  geodsg: string;
  dim_3?: string;
  valor?: string;
}

export interface IneIndicator {
  IndicadorCod: string;
  IndicadorDsg: string;
  DataUltimoAtualizacao: string;
  Dados: Record<string, IneRow[]>;
}

export interface TransactionPoint {
  geoLevel: "country" | "municipality";
  geoCode: string;
  period: string; // first day of the quarter, YYYY-MM-DD
  ppm: number;
}

/** "2.º Trimestre de 2026" → "2026-04-01". Returns null for periods that are not quarters. */
export function quarterStart(label: string): string | null {
  const m = /(\d)\.?\s*[ºo°]?\s*Trimestre de (\d{4})/i.exec(label);
  if (!m) return null;
  const q = Number(m[1]);
  if (q < 1 || q > 4) return null;
  return `${m[2]}-${String((q - 1) * 3 + 1).padStart(2, "0")}-01`;
}

/**
 * Median sale price per m² (all dwellings, category H1 "Total") for Portugal and every municipality.
 * Municipality geocodes are 7 characters (NUTS III code + 4-digit DTMN municipality code), e.g. "1A01106" → "1106".
 * Rows without a value (statistical confidentiality) are skipped, never filled in.
 */
export function parseSalesMedians(data: IneIndicator, category = "H1"): TransactionPoint[] {
  const out: TransactionPoint[] = [];
  for (const [label, rows] of Object.entries(data.Dados ?? {})) {
    const period = quarterStart(label);
    if (!period) continue;
    for (const r of rows) {
      if (r.dim_3 !== category || !r.valor) continue;
      const ppm = Number(r.valor);
      if (!Number.isFinite(ppm) || ppm <= 0) continue;
      if (r.geocod === "PT") out.push({ geoLevel: "country", geoCode: "PT", period, ppm });
      else if (/^[0-9A-Z]{3}\d{4}$/.test(r.geocod) && r.geocod.length === 7) out.push({ geoLevel: "municipality", geoCode: r.geocod.slice(3), period, ppm });
    }
  }
  return out;
}

/** ECB SDMX CSV (`format=csvdata`) → [{ month: "YYYY-MM-01", value }]. Skips rows without a numeric observation. */
export function parseEcbCsv(csv: string): { month: string; value: number }[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",") ?? [];
  const t = header.indexOf("TIME_PERIOD");
  const v = header.indexOf("OBS_VALUE");
  if (t < 0 || v < 0) return [];
  const out: { month: string; value: number }[] = [];
  for (const line of lines) {
    const cols = line.split(","); // the first columns never contain commas; titles (quoted) come after OBS_VALUE
    const period = cols[t];
    const raw = cols[v]?.trim();
    const value = raw ? Number(raw) : NaN; // an empty cell is a missing observation, not zero
    if (period && /^\d{4}-\d{2}$/.test(period) && Number.isFinite(value)) out.push({ month: `${period}-01`, value });
  }
  return out;
}
