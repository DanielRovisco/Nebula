import { describe, expect, it } from "vitest";
import { parseNaturalQuery as p } from "./nl-search";

describe("parseNaturalQuery", () => {
  it("T2 em Lisboa até 350k com varanda", () => {
    const r = p("T2 em Lisboa até 350k com varanda");
    expect(r.filters).toMatchObject({ business: "sale", typologies: [2], priceMax: 350000, balcony: true });
    expect(r.place).toBe("lisboa");
  });
  it("rent keywords and monthly price", () => {
    const r = p("alugar apartamento T1 no Porto máximo 900 €");
    expect(r.filters).toMatchObject({ business: "rent", types: ["apartment"], typologies: [1], priceMax: 900 });
    expect(r.place).toBe("porto");
  });
  it("price range with k and mil", () => {
    expect(p("moradia entre 300k e 500k em Cascais").filters).toMatchObject({ types: ["house"], priceMin: 300000, priceMax: 500000 });
    expect(p("casa até 1,2 milhões").filters.priceMax).toBe(1200000);
    expect(p("apartamento até 250 mil euros").filters.priceMax).toBe(250000);
  });
  it("T3+ expands to all larger typologies", () => expect(p("T3+ em Faro").filters.typologies).toEqual([3, 4, 5]));
  it("bedrooms and area", () => {
    const r = p("2 quartos mais de 80 m2 em Braga");
    expect(r.filters).toMatchObject({ bedrooms: 2, areaMin: 80 });
    expect(r.place).toBe("braga");
  });
  it("com garagem is parking, garagem alone is the type", () => {
    expect(p("apartamento com garagem em Setúbal").filters).toMatchObject({ parking: 1, types: ["apartment"] });
    expect(p("garagem em Setúbal").filters.types).toEqual(["garage"]);
  });
  it("conditions, views, energy and private seller", () => {
    const r = p("apartamento novo vista mar classe A particular em Lagos");
    expect(r.filters).toMatchObject({ conditions: ["new"], views: ["mar"], advertiser: "private" });
    expect(r.filters.energy).toEqual(["A+", "A"]);
  });
  it("reports unsupported proximity instead of guessing", () => {
    const r = p("T2 perto do metro em Lisboa");
    expect(r.ignored.length).toBe(1);
    expect(r.filters.typologies).toEqual([2]);
    expect(r.place).toBe("lisboa");
  });
  it("English works too", () => {
    const r = p("2 bedroom flat for rent in Lisbon under 1500");
    expect(r.filters).toMatchObject({ business: "rent", types: ["apartment"], bedrooms: 2, priceMax: 1500 });
    expect(r.place).toBe("lisbon");
  });
  it("empty input yields no chips", () => expect(p("   ").chips).toEqual([]));
});
