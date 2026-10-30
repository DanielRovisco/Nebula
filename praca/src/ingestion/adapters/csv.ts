import Papa from "papaparse";
import type { AdapterContext, ParseResult, SourceAdapter } from "../types";

/** CSV/TSV/semicolon files exported by agency software. Delimiter is auto-detected; a UTF-8 BOM is tolerated. */
export const csvAdapter: SourceAdapter = {
  id: "csv",
  name: "CSV (exportação de agência)",
  formats: ["csv", "tsv", "txt"],
  parse(input: string, _ctx?: AdapterContext): ParseResult {
    const parsed = Papa.parse<Record<string, string>>(input.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    const warnings = parsed.errors.filter((e) => e.type !== "FieldMismatch").slice(0, 10).map((e) => `Linha ${(e.row ?? 0) + 2}: ${e.message}`);
    return { records: parsed.data, warnings };
  },
};

/** Header names of a CSV, for the mapping UI. */
export function csvHeaders(input: string): string[] {
  const p = Papa.parse<string[]>(input.replace(/^﻿/, ""), { preview: 1 });
  return (p.data[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
}
