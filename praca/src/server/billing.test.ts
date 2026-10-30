import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { snapshotFromStripe } from "./billing";

const env = { STRIPE_PRICE_PRO_MONTH: "price_pm", STRIPE_PRICE_AGENCY_YEAR: "price_ay" };
const sub = (over: Record<string, unknown> = {}) =>
  ({
    id: "sub_1",
    customer: "cus_1",
    status: "trialing",
    trial_end: 1_800_000_000,
    cancel_at_period_end: false,
    metadata: { userId: "u1", plan: "pro" },
    items: { data: [{ quantity: 1, current_period_end: 1_801_000_000, price: { id: "price_pm", recurring: { interval: "month" } } }] },
    ...over,
  }) as unknown as Stripe.Subscription;

describe("snapshotFromStripe", () => {
  it("maps a trialing Pro subscription", () => {
    const s = snapshotFromStripe(sub(), env)!;
    expect(s).toMatchObject({ plan: "pro", interval: "month", status: "trialing", seats: 1, userId: "u1", organizationId: null, stripeCustomerId: "cus_1" });
    expect(s.trialEndsAt?.getTime()).toBe(1_800_000_000_000);
  });
  it("maps agency seats and organisation", () => {
    const s = snapshotFromStripe(sub({ metadata: { organizationId: "o1", plan: "agency" }, items: { data: [{ quantity: 7, price: { id: "price_ay", recurring: { interval: "year" } } }] } }), env)!;
    expect(s).toMatchObject({ plan: "agency", interval: "year", seats: 7, organizationId: "o1", userId: null });
  });
  it("falls back to metadata when the price is unknown, and ignores unknown plans", () => {
    expect(snapshotFromStripe(sub({ items: { data: [{ quantity: 1, price: { id: "price_other", recurring: { interval: "month" } } }] } }), env)?.plan).toBe("pro");
    expect(snapshotFromStripe(sub({ metadata: {}, items: { data: [{ quantity: 1, price: { id: "price_other" } }] } }), env)).toBeNull();
  });
});

describe("webhook signatures", () => {
  const secret = "whsec_test_secret";
  const stripe = new Stripe("sk_test_dummy");
  const payload = JSON.stringify({ id: "evt_1", object: "event", type: "customer.subscription.updated", data: { object: {} } });
  it("accepts a correctly signed payload and rejects tampering", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_1");
    expect(() => stripe.webhooks.constructEvent(payload + " ", header, secret)).toThrow();
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_other")).toThrow();
  });
});
