import { describe, expect, it } from "vitest";
import { parseFilters } from "./filters";
import { buildSearchHref } from "./search-url";

describe("buildSearchHref", () => {
  it("puts one type and the geography in the path, the rest in the query", () => {
    const f = parseFilters("sale", new URLSearchParams("tipo=apartment&t=2&pmax=300000"));
    expect(buildSearchHref(f, { district: "lisboa", municipality: "sintra" })).toBe("/comprar/apartamento/lisboa/sintra?t=2&pmax=300000");
  });
  it("keeps several types in the query", () => {
    const f = parseFilters("rent", new URLSearchParams("tipo=apartment,house"));
    expect(buildSearchHref(f, {})).toBe("/arrendar?tipo=apartment%2Chouse");
  });
  it("is a clean path without filters", () => {
    expect(buildSearchHref(parseFilters("sale", new URLSearchParams()), {})).toBe("/comprar");
  });
});
