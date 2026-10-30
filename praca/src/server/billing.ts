import type Stripe from "stripe";
import { sql } from "@/db";
import { isActiveStatus, planForPrice, type PlanId } from "@/lib/plans";

export interface SubscriptionSnapshot {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  plan: PlanId;
  interval: "month" | "year" | null;
  seats: number;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  userId: string | null;
  organizationId: string | null;
}

/** Pure mapping from a Stripe Subscription object to our row shape (metadata carries who bought it). */
export function snapshotFromStripe(sub: Stripe.Subscription, env: Record<string, string | undefined> = process.env): SubscriptionSnapshot | null {
  const item = sub.items.data[0];
  const mapped = planForPrice(item?.price.id, env);
  const metaPlan = sub.metadata?.plan as PlanId | undefined;
  const plan = mapped?.plan ?? (metaPlan === "pro" || metaPlan === "agency" ? metaPlan : null);
  if (!plan) return null;
  const periodEnd = (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return {
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    plan,
    interval: mapped?.interval ?? (item?.price.recurring?.interval === "year" ? "year" : item?.price.recurring?.interval === "month" ? "month" : null),
    seats: item?.quantity ?? 1,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    userId: sub.metadata?.userId || null,
    organizationId: sub.metadata?.organizationId || null,
  };
}

/** Idempotent upsert of the subscription row; keeps organizations.plan in sync for team plans. */
export async function applySubscription(s: SubscriptionSnapshot) {
  await sql`
    INSERT INTO subscriptions (user_id, organization_id, plan, status, interval, seats, stripe_customer_id, stripe_subscription_id, trial_ends_at, current_period_end, cancel_at_period_end)
    VALUES (${s.userId}, ${s.organizationId}, ${s.plan}, ${s.status}, ${s.interval}, ${s.seats}, ${s.stripeCustomerId}, ${s.stripeSubscriptionId}, ${s.trialEndsAt}, ${s.currentPeriodEnd}, ${s.cancelAtPeriodEnd})
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      plan = EXCLUDED.plan, status = EXCLUDED.status, interval = EXCLUDED.interval, seats = EXCLUDED.seats, trial_ends_at = EXCLUDED.trial_ends_at,
      current_period_end = EXCLUDED.current_period_end, cancel_at_period_end = EXCLUDED.cancel_at_period_end, updated_at = now()`;
  if (s.organizationId) {
    await sql`UPDATE organizations SET plan = ${isActiveStatus(s.status) ? s.plan : "free"} WHERE id = ${s.organizationId}`;
  }
}
