import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const stripe = getStripe();
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "invalid_signature", detail: (err as Error).message }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const kind = (session.metadata?.kind as "one_off" | "monthly" | undefined) ?? "one_off";
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

      await service.from("donations").insert({
        user_id: userId ?? null,
        stripe_customer_id: customerId,
        stripe_session_id: session.id,
        stripe_subscription_id: subscriptionId,
        kind,
        amount_cents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        status: "succeeded",
      });
      break;
    }
    case "invoice.paid": {
      // Recurring supporter renewal: record a new donation row keyed on the invoice.
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
      if (invoice.billing_reason === "subscription_cycle" || invoice.billing_reason === "subscription_create") {
        await service.from("donations").insert({
          user_id: null, // backfilled below if we find a prior row with this customer
          stripe_customer_id: customerId,
          stripe_session_id: invoice.id,
          stripe_subscription_id: typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null,
          kind: "monthly",
          amount_cents: invoice.amount_paid ?? 0,
          currency: invoice.currency ?? "usd",
          status: "succeeded",
        });
        if (customerId) {
          const { data: prior } = await service
            .from("donations")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .not("user_id", "is", null)
            .limit(1)
            .maybeSingle();
          if (prior?.user_id) {
            await service
              .from("donations")
              .update({ user_id: prior.user_id })
              .eq("stripe_session_id", invoice.id);
          }
        }
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
