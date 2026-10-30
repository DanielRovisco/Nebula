export type PlanId = "free" | "pro" | "agency";
export type Interval = "month" | "year";

/**
 * Display catalogue. Stripe is the source of truth for what is charged: the amounts shown here must
 * match the Stripe Prices configured in STRIPE_PRICE_* (see docs/DEPLOY.md step 3). Amounts are EUR, VAT included.
 */
export const PLANS: Record<PlanId, { price: Record<Interval, number>; perSeat: boolean; trialDays: number }> = {
  free: { price: { month: 0, year: 0 }, perSeat: false, trialDays: 0 },
  pro: { price: { month: 19, year: 190 }, perSeat: false, trialDays: 14 },
  agency: { price: { month: 49, year: 490 }, perSeat: true, trialDays: 14 },
};

export const TRIAL_DAYS = 14;

/** Maps a Stripe Price id to our plan, from the STRIPE_PRICE_* environment variables. */
export function planForPrice(priceId: string | null | undefined, env: Record<string, string | undefined> = process.env): { plan: PlanId; interval: Interval } | null {
  if (!priceId) return null;
  const table: [string | undefined, PlanId, Interval][] = [
    [env.STRIPE_PRICE_PRO_MONTH, "pro", "month"],
    [env.STRIPE_PRICE_PRO_YEAR, "pro", "year"],
    [env.STRIPE_PRICE_AGENCY_MONTH, "agency", "month"],
    [env.STRIPE_PRICE_AGENCY_YEAR, "agency", "year"],
  ];
  const hit = table.find(([id]) => id && id === priceId);
  return hit ? { plan: hit[1], interval: hit[2] } : null;
}

export function priceIdFor(plan: Exclude<PlanId, "free">, interval: Interval, env: Record<string, string | undefined> = process.env): string | undefined {
  return { pro: { month: env.STRIPE_PRICE_PRO_MONTH, year: env.STRIPE_PRICE_PRO_YEAR }, agency: { month: env.STRIPE_PRICE_AGENCY_MONTH, year: env.STRIPE_PRICE_AGENCY_YEAR } }[plan][interval];
}

const ACTIVE = new Set(["trialing", "active", "past_due"]);
export const isActiveStatus = (s: string) => ACTIVE.has(s);
