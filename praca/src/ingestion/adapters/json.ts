import type { ParseResult, RawRecord, SourceAdapter } from "../types";

/** JSON: an array of adverts, or an object with the array under items/listings/properties/data/results. */
export const jsonAdapter: SourceAdapter = {
  id: "json",
  name: "JSON / API",
  formats: ["json"],
  parse(input: string): ParseResult {
    let data: unknown;
    try {
      data = JSON.parse(input.replace(/^﻿/, ""));
    } catch (e) {
      return { records: [], warnings: [`JSON inválido: ${(e as Error).message}`] };
    }
    const arr = Array.isArray(data) ? data : (["items", "listings", "properties", "imoveis", "data", "results"].map((k) => (data as Record<string, unknown>)?.[k]).find(Array.isArray) as unknown[] | undefined);
    if (!arr) return { records: [], warnings: ["Não foi encontrada uma lista de anúncios no JSON."] };
    return { records: arr.filter((x): x is RawRecord => typeof x === "object" && x !== null && !Array.isArray(x)), warnings: [] };
  },
};
