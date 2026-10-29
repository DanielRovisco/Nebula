import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";

function keys(o: unknown, prefix = ""): string[] {
  if (typeof o !== "object" || o === null) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("i18n catalogues", () => {
  it("pt and en have exactly the same keys", () => {
    const a = new Set(keys(pt));
    const b = new Set(keys(en));
    expect([...a].filter((k) => !b.has(k))).toEqual([]);
    expect([...b].filter((k) => !a.has(k))).toEqual([]);
  });
  it("placeholders match between languages", () => {
    const flat = (o: unknown, p = ""): [string, string][] =>
      typeof o === "string" ? [[p, o]] : Object.entries(o as object).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k));
    const ph = (s: string) => [...s.replace(/(=\d+|one|other)\s*\{[^{}]*\}/g, "").matchAll(/\{(\w+)/g)].map((m) => m[1]).sort().join(",");
    const enMap = new Map(flat(en));
    for (const [k, v] of flat(pt)) expect(ph(enMap.get(k) ?? ""), k).toBe(ph(v));
  });
});
