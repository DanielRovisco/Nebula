import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { csvAdapter, csvHeaders, jsonAdapter, kyeroAdapter } from "./adapters";
import { SOURCE_STUBS, fetchStub } from "./adapters/stubs";
import { mapCondition, mapEnergy, mapType, normalizePostalCode, normalizeRecord, parseBool, parseNumber, parseTypology } from "./normalize";

const ex = (f: string) => readFileSync(join(process.cwd(), "examples/ingestion", f), "utf8");

describe("normalise primitives", () => {
  it("parses pt-PT and en numbers", () => {
    expect(parseNumber("285.000")).toBe(285000);
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("1 234,5")).toBe(1234.5);
    expect(parseNumber("€ 250,000")).toBe(250000);
    expect(parseNumber("78,5")).toBe(78.5);
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber("")).toBeUndefined();
  });
  it("maps vocabulary", () => {
    expect(mapType("Apartamento T2")).toBe("apartment");
    expect(mapType("Villa")).toBe("house");
    expect(mapType("Terreno urbano")).toBe("land");
    expect(mapCondition("Para recuperar")).toBe("to_renovate");
    expect(mapCondition("Em construção")).toBe("under_construction");
    expect(mapEnergy("a+")).toBe("A+");
    expect(mapEnergy("Isento")).toBe("exempt");
    expect(parseTypology("T3+1")).toBe(3);
    expect(parseTypology("", 6)).toBe(5);
    expect(parseBool("Sim")).toBe(true);
    expect(parseBool("não")).toBe(false);
    expect(normalizePostalCode("1200 195")).toBe("1200-195");
  });
});

describe("CSV adapter + normalisation", () => {
  const { records, warnings } = csvAdapter.parse(ex("agency.csv"));
  it("reads semicolon-separated rows", () => {
    expect(warnings).toEqual([]);
    expect(records.length).toBe(5);
    expect(csvHeaders(ex("agency.csv"))).toContain("preco");
  });
  it("normalises good rows and rejects the bad one with a reason", () => {
    const r = records.map((x) => normalizeRecord(x));
    const ok = r.filter((x) => x.ok);
    expect(ok.length).toBe(4);
    const first = (r[0] as { ok: true; value: import("./types").NormalizedListing }).value;
    expect(first).toMatchObject({ externalId: "ACME-001", business: "sale", type: "apartment", typology: 2, price: 285000, usableArea: 78, energyClass: "B", elevator: true, balcony: true, postalCode: "1200-195", condition: "used" });
    expect(first.lat).toBeCloseTo(38.7107, 4);
    const rent = (r[1] as { ok: true; value: import("./types").NormalizedListing }).value;
    expect(rent.business).toBe("rent");
    expect(rent.price).toBe(1150);
    const priv = (r[2] as { ok: true; value: import("./types").NormalizedListing }).value;
    expect(priv.advertiserType).toBe("private");
    const bad = r[4]!;
    expect(bad.ok).toBe(false);
    expect((bad as { error: string }).error).toMatch(/price/);
  });
  it("honours an explicit column mapping", () => {
    const res = normalizeRecord({ Referência: "X1", Valor: "100000", Operação: "venda", Categoria: "Moradia" }, { mapping: { externalId: "Referência", price: "Valor", business: "Operação", type: "Categoria" } });
    expect(res.ok).toBe(true);
  });
});

describe("Kyero XML adapter", () => {
  const { records, warnings } = kyeroAdapter.parse(ex("feed-kyero.xml"));
  it("reads properties, images and localised descriptions", () => {
    expect(warnings).toEqual([]);
    expect(records.length).toBe(2);
    expect(records[0]).toMatchObject({ id: "K-100", price: "450000", price_freq: "sale", type: "Apartment", town: "Porto" });
    expect(records[0]!.images).toHaveLength(2);
    expect(records[0]!.desc).toContain("Apartamento T3");
    expect(records[1]).toMatchObject({ price_freq: "rent", pool: true });
  });
  it("normalises into listings", () => {
    const a = normalizeRecord(records[0]!);
    expect(a.ok && a.value).toMatchObject({ business: "sale", type: "apartment", typology: 3, usableArea: 110, elevator: true, balcony: true, energyClass: "B" });
    const b = normalizeRecord(records[1]!);
    expect(b.ok && b.value).toMatchObject({ business: "rent", type: "house", price: 1800, pool: true, garden: true });
    expect(b.ok && b.value.imageUrls).toEqual(["https://cdn.example/k101-1.jpg"]);
  });
  it("reports invalid XML and empty feeds", () => {
    expect(kyeroAdapter.parse("<root></root>").warnings[0]).toMatch(/property/);
  });
});

describe("JSON adapter", () => {
  it("finds the list under a known key and normalises with aliases", () => {
    const { records } = jsonAdapter.parse(ex("agency.json"));
    expect(records.length).toBe(2);
    const a = normalizeRecord(records[0]!);
    expect(a.ok && a.value).toMatchObject({ externalId: "J-1", business: "sale", type: "apartment", typology: 3, municipalityName: "Coimbra" });
    const b = normalizeRecord(records[1]!);
    expect(b.ok && b.value).toMatchObject({ business: "rent", type: "office" });
  });
  it("tolerates broken JSON", () => {
    expect(jsonAdapter.parse("{nope").warnings[0]).toMatch(/inválido/);
  });
});

describe("licensed-source stubs", () => {
  it("always fail loudly with what is missing", async () => {
    await expect(fetchStub("transactions-partner")).rejects.toThrow(/acordo comercial/);
    expect(SOURCE_STUBS.length).toBeGreaterThanOrEqual(4);
  });
});
