import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { applySubscription, snapshotFromStripe } from "@/server/billing";
import { stripe } from "@/server/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The signature is verified against the RAW body before anything is trusted.
 * Handled: checkout.session.completed, customer.subscription.created/updated/deleted.
 */
export async function POST(req: NextRequest) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await s.subscriptions.retrieve(subId);
        // Metadata set on the Checkout Session is mirrored onto the subscription at creation; be defensive.
        sub.metadata = { ...session.metadata, ...sub.metadata };
        const snap = snapshotFromStripe(sub);
        if (snap) await applySubscription(snap);
      }
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const snap = snapshotFromStripe(event.data.object as Stripe.Subscription);
      if (snap) await applySubscription({ ...snap, status: event.type === "customer.subscription.deleted" ? "canceled" : snap.status });
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
