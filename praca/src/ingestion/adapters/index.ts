import type { SourceAdapter } from "../types";
import { csvAdapter } from "./csv";
import { jsonAdapter } from "./json";
import { kyeroAdapter } from "./kyero";

export const ADAPTERS: Record<string, SourceAdapter> = { csv: csvAdapter, json: jsonAdapter, kyero: kyeroAdapter };

export function adapterForFormat(format: string | null | undefined, filename?: string): SourceAdapter | null {
  if (format && ADAPTERS[format]) return ADAPTERS[format]!;
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (ext === "xml") return kyeroAdapter;
  if (ext === "json") return jsonAdapter;
  if (ext === "csv" || ext === "tsv" || ext === "txt") return csvAdapter;
  return null;
}

export { csvAdapter, jsonAdapter, kyeroAdapter };
export { csvHeaders } from "./csv";
