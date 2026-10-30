import { describe, expect, it } from "vitest";
import { isActiveStatus, planForPrice, priceIdFor } from "./plans";

const env = { STRIPE_PRICE_PRO_MONTH: "price_pm", STRIPE_PRICE_PRO_YEAR: "price_py", STRIPE_PRICE_AGENCY_MONTH: "price_am", STRIPE_PRICE_AGENCY_YEAR: "price_ay" };

describe("plans", () => {
  it("maps Stripe prices to plans and intervals", () => {
    expect(planForPrice("price_py", env)).toEqual({ plan: "pro", interval: "year" });
    expect(planForPrice("price_am", env)).toEqual({ plan: "agency", interval: "month" });
    expect(planForPrice("price_x", env)).toBeNull();
    expect(planForPrice(undefined, env)).toBeNull();
  });
  it("resolves the price id for a plan", () => {
    expect(priceIdFor("agency", "year", env)).toBe("price_ay");
    expect(priceIdFor("pro", "month", {})).toBeUndefined();
  });
  it("only trialing, active and past_due grant access", () => {
    expect(isActiveStatus("trialing")).toBe(true);
    expect(isActiveStatus("canceled")).toBe(false);
    expect(isActiveStatus("incomplete")).toBe(false);
  });
});
