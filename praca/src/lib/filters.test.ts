import { describe, expect, it } from "vitest";
import { countActiveFilters, filtersToParams, parseFilters } from "./filters";

describe("parseFilters", () => {
  it("roundtrips a realistic query", () => {
    const qs = "tipo=apartment&t=2,3&pmin=150000&pmax=300000&elevador=1&varanda=1&estado=novo,usado&energia=a,b&vista=mar&pub=7d&anunciante=particular&ordem=price_asc";
    const f = parseFilters("sale", new URLSearchParams(qs));
    expect(f.types).toEqual(["apartment"]);
    expect(f.typologies).toEqual([2, 3]);
    expect(f.priceMin).toBe(150000);
    expect(f.conditions).toEqual(["new", "used"]);
    expect(f.energy).toEqual(["A", "B"]);
    expect(f.advertiser).toBe("private");
    const back = parseFilters("sale", filtersToParams(f));
    expect(back).toEqual(f);
  });
  it("drops invalid values instead of throwing", () => {
    const f = parseFilters("rent", new URLSearchParams("t=9,x,2&pmin=abc&ordem=hack&bbox=1,2,3&tipo=castle&agencia=not-a-uuid"));
    expect(f.typologies).toEqual([2]);
    expect(f.priceMin).toBeUndefined();
    expect(f.sort).toBe("relevance");
    expect(f.bbox).toBeUndefined();
    expect(f.types).toEqual([]);
    expect(f.agency).toBeUndefined();
  });
  it("accepts a valid bbox over Portugal and rejects one outside", () => {
    expect(parseFilters("sale", new URLSearchParams("bbox=-9.5,38.6,-9.0,38.9")).bbox).toBeDefined();
    expect(parseFilters("sale", new URLSearchParams("bbox=100,10,110,20")).bbox).toBeUndefined();
  });
  it("counts grouped filters once", () => {
    const f = parseFilters("sale", new URLSearchParams("pmin=1&pmax=2&elevador=1&q=sol&ordem=price_asc"));
    expect(countActiveFilters(f)).toBe(3);
  });
});
