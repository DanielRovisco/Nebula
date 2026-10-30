import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("adds +351 to Portuguese mobile and landline numbers", () => {
    expect(toE164("912 345 678")).toBe("+351912345678");
    expect(toE164("21 234 5678")).toBe("+351212345678");
  });
  it("accepts international formats", () => {
    expect(toE164("+44 20 7946 0958")).toBe("+442079460958");
    expect(toE164("0034 612 345 678")).toBe("+34612345678");
  });
  it("rejects numbers that cannot be valid", () => {
    expect(toE164("123")).toBeNull();
    expect(toE164("812345678")).toBeNull();
    expect(toE164("abc")).toBeNull();
  });
});
