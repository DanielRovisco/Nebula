import { sql } from "@/db";
import type { TaxBracket } from "@/lib/calc";

export interface FiscalTable {
  tax: string;
  scope: string;
  validFrom: string;
  sourceNote: string;
  verified: boolean;
  brackets: TaxBracket[];
}

/** Latest table in force for (tax, scope). Falls back to the most recent past validity start. */
export async function getFiscalTable(tax: string, scope: string, on = new Date()): Promise<FiscalTable | null> {
  const [r] = await sql<{ tax: string; scope: string; valid_from: string; source_note: string; verified_at: string | null; brackets: TaxBracket[] }[]>`
    SELECT tax, scope, valid_from::text, source_note, verified_at::text, brackets
    FROM fiscal_tables
    WHERE tax = ${tax} AND scope = ${scope} AND valid_from <= ${on.toISOString().slice(0, 10)}::date
      AND (valid_to IS NULL OR valid_to >= ${on.toISOString().slice(0, 10)}::date)
    ORDER BY valid_from DESC LIMIT 1`;
  return r ? { tax: r.tax, scope: r.scope, validFrom: r.valid_from, sourceNote: r.source_note, verified: !!r.verified_at, brackets: r.brackets } : null;
}

export async function getRate(code: string): Promise<{ value: number; validFrom: string; source: string } | null> {
  const [r] = await sql<{ value: number; valid_from: string; source: string }[]>`
    SELECT value::float8, valid_from::text, source FROM rates WHERE code = ${code} ORDER BY valid_from DESC LIMIT 1`;
  return r ? { value: r.value, validFrom: r.valid_from, source: r.source } : null;
}
