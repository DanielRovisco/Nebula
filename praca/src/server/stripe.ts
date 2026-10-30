import Stripe from "stripe";

let client: Stripe | null = null;

/** Lazily created Stripe client; null when STRIPE_SECRET_KEY is missing (mock mode / not configured). */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { typescript: true, appInfo: { name: "Praça" } });
  return client;
}

export const mockBilling = () => process.env.STRIPE_MOCK === "1" && process.env.NEXT_PUBLIC_APP_ENV !== "production";
