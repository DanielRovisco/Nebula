"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/db";
import { PLANS, priceIdFor, TRIAL_DAYS } from "@/lib/plans";
import { siteUrl } from "@/lib/env";
import { effectivePlan } from "./entitlements";
import { getOrgContext } from "./org";
import { currentUser } from "./session";
import { mockBilling, stripe } from "./stripe";

const input = z.object({ plan: z.enum(["pro", "agency"]), interval: z.enum(["month", "year"]), seats: z.coerce.number().int().min(1).max(50).default(1) });

export interface CheckoutState {
  error?: "auth" | "invalid" | "org" | "not_configured" | "failed" | "already";
}

export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const u = await currentUser();
  if (!u) return { error: "auth" };
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  const { plan, interval, seats } = parsed.data;

  const org = await getOrgContext();
  if (plan === "agency" && (!org || (org.role !== "owner" && org.role !== "admin"))) return { error: "org" }; // team plans belong to an organisation
  const current = await effectivePlan(u.id);
  if (current.plan === plan && current.source !== "free") return { error: "already" };

  const organizationId = plan === "agency" ? org!.orgId : null;

  // Local/demo mode: simulate a successful checkout (14-day trial) without calling Stripe. Never active in production.
  if (mockBilling()) {
    const trialEnds = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
    await sql`INSERT INTO subscriptions (user_id, organization_id, plan, status, interval, seats, stripe_subscription_id, trial_ends_at, current_period_end)
              VALUES (${plan === "pro" ? u.id : null}, ${organizationId}, ${plan}, 'trialing', ${interval}, ${seats}, ${`mock_${crypto.randomUUID()}`}, ${trialEnds}, ${trialEnds})`;
    if (organizationId) await sql`UPDATE organizations SET plan = 'agency' WHERE id = ${organizationId}`;
    redirect("/conta?plano=ativo");
  }

  const s = stripe();
  const price = priceIdFor(plan, interval);
  if (!s || !price) return { error: "not_configured" };

  let url: string | null = null;
  try {
    const [existing] = await sql<{ stripe_customer_id: string | null }[]>`
      SELECT stripe_customer_id FROM subscriptions WHERE (user_id = ${u.id} OR organization_id = ${organizationId}) AND stripe_customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`;
    const metadata = { plan, userId: plan === "pro" ? u.id : "", organizationId: organizationId ?? "" };
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: PLANS[plan].perSeat ? seats : 1 }],
      ...(existing?.stripe_customer_id ? { customer: existing.stripe_customer_id } : { customer_email: u.email }),
      client_reference_id: organizationId ?? u.id,
      subscription_data: { trial_period_days: TRIAL_DAYS, metadata },
      metadata,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      success_url: `${siteUrl}/conta?plano=ativo`,
      cancel_url: `${siteUrl}/planos?cancelado=1`,
    });
    url = session.url;
  } catch (e) {
    console.error("[checkout]", e);
    return { error: "failed" };
  }
  if (!url) return { error: "failed" };
  redirect(url);
}

export async function openBillingPortal(): Promise<void> {
  const u = await currentUser();
  if (!u) redirect("/entrar");
  const s = stripe();
  const [row] = await sql<{ stripe_customer_id: string | null }[]>`
    SELECT stripe_customer_id FROM subscriptions
    WHERE (user_id = ${u.id} OR organization_id IN (SELECT organization_id FROM memberships WHERE user_id = ${u.id} AND role IN ('owner','admin')))
      AND stripe_customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`;
  if (!s || !row?.stripe_customer_id) redirect("/planos");
  const session = await s.billingPortal.sessions.create({ customer: row.stripe_customer_id, return_url: `${siteUrl}/conta` });
  redirect(session.url);
}
