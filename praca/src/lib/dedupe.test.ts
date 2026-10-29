import { describe, expect, it } from "vitest";
import { MERGE_THRESHOLD, hammingHex, scoreDuplicate, trigramSimilarity } from "./dedupe";
import { fingerprint } from "./fingerprint";

const base = { type: "apartment", typology: 2, usableArea: 82, floor: 3, lat: 38.7369, lng: -9.1427, address: "Rua Alexandre Herculano 12, 3.º Esq", price: 485000 };

describe("fingerprint", () => {
  it("is stable for tiny coordinate and area noise", () => {
    expect(fingerprint({ ...base, lat: 38.73694, lng: -9.14272, usableArea: 83 })).toBe(fingerprint(base));
  });
  it("differs across floors", () => {
    expect(fingerprint({ ...base, floor: 4 })).not.toBe(fingerprint(base));
  });
});

describe("scoreDuplicate", () => {
  it("merges the same flat advertised by two agencies with a slightly different price", () => {
    const other = { ...base, lat: 38.73698, lng: -9.14265, usableArea: 81, price: 479000, address: "R. Alexandre Herculano, 12 - 3º Esquerdo" };
    const r = scoreDuplicate(base, other);
    expect(r.decision).toBe("merge");
    expect(r.score).toBeGreaterThanOrEqual(MERGE_THRESHOLD);
  });
  it("keeps neighbours on different floors apart", () => {
    const r = scoreDuplicate(base, { ...base, floor: 5, usableArea: 95, price: 560000, address: "Rua Alexandre Herculano 12, 5.º Dto" });
    expect(r.decision).not.toBe("merge");
  });
  it("never merges different typologies or types", () => {
    expect(scoreDuplicate(base, { ...base, typology: 3 }).decision).toBe("distinct");
    expect(scoreDuplicate(base, { ...base, type: "house" }).decision).toBe("distinct");
  });
  it("sends borderline cases to review", () => {
    const r = scoreDuplicate(base, { ...base, lat: 38.7373, usableArea: 79, floor: null, address: "Rua Alexandre Herculano", price: 500000 });
    expect(r.decision).toBe("review");
  });
  it("shared photos settle a match even when coordinates are loose", () => {
    const a = { ...base, photoHashes: ["f0f0f0f0f0f0f0f0", "0123456789abcdef"] };
    const b = { ...base, lat: 38.7378, lng: -9.1431, address: null, photoHashes: ["f0f0f0f0f0f0f0f1", "ffffffffffffffff"] };
    expect(scoreDuplicate(a, b).decision).toBe("merge");
  });
  it("never merges listings hundreds of metres apart", () => {
    const r = scoreDuplicate(base, { ...base, lat: 38.7469 });
    expect(r.decision).toBe("distinct");
  });
});

describe("helpers", () => {
  it("trigram similarity ignores accents and punctuation", () => {
    expect(trigramSimilarity("Avenida da Liberdade, 10", "avenida da liberdade 10")).toBeGreaterThan(0.95);
    expect(trigramSimilarity("Rua das Flores", "Avenida do Brasil")).toBeLessThan(0.3);
  });
  it("hamming distance", () => {
    expect(hammingHex("ff", "fe")).toBe(1);
  });
});
