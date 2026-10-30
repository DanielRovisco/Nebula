import { describe, expect, it } from "vitest";
import { fraudScore, fraudSignals, type FraudFacts } from "./fraud";

const base: FraudFacts = { business: "sale", pricePerM2: 4000, zoneMedianPpm: 4200, zoneN: 40, title: "T2 em Lisboa", description: "Apartamento luminoso.", advertiserType: "professional", advertiserActiveListings: 3, duplicateAdvertisers: 1, duplicatePriceSpread: 0 };
const codes = (f: Partial<FraudFacts>) => fraudSignals({ ...base, ...f }).map((s) => s.code);

describe("fraudSignals", () => {
  it("a normal listing has none", () => expect(codes({})).toEqual([]));
  it("flags prices far below the zone median", () => {
    expect(codes({ pricePerM2: 1900 })).toEqual(["price_far_below_market"]);
    expect(codes({ pricePerM2: 2800 })).toEqual(["price_below_market"]);
  });
  it("ignores the price rule when the zone sample is thin", () => expect(codes({ pricePerM2: 1000, zoneN: 5 })).toEqual([]));
  it("detects advance-payment language in Portuguese and English", () => {
    expect(codes({ description: "Envie um sinal por transferência antes da visita." })).toContain("advance_payment_request");
    expect(codes({ description: "Please pay a deposit before viewing." })).toContain("advance_payment_request");
    expect(codes({ description: "Aceito Western Union" })).toContain("advance_payment_request");
  });
  it("detects an absent owner", () => expect(codes({ description: "Sou o proprietário e estou no estrangeiro, envio as chaves por correio." })).toContain("absent_owner"));
  it("flags private advertisers with many listings", () => {
    expect(codes({ advertiserType: "private", advertiserActiveListings: 8 })).toContain("private_with_many_listings");
    expect(codes({ advertiserType: "professional", advertiserActiveListings: 80 })).toEqual([]);
  });
  it("conflicting prices across advertisers is information only", () => {
    const s = fraudSignals({ ...base, duplicateAdvertisers: 4, duplicatePriceSpread: 0.4 });
    expect(s[0]).toMatchObject({ code: "conflicting_prices", severity: 1 });
  });
});

describe("fraudScore", () => {
  it("weights by severity and caps at 100", () => {
    expect(fraudScore([])).toBe(0);
    expect(fraudScore([{ code: "a", severity: 3, detail: {} }, { code: "b", severity: 2, detail: {} }])).toBe(60);
    expect(fraudScore(Array.from({ length: 5 }, (_, i) => ({ code: String(i), severity: 3 as const, detail: {} })))).toBe(100);
  });
});
