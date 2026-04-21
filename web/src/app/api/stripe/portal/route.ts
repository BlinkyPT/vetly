import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Opens the Stripe billing portal. Used by monthly supporters who want to
 * update their card, change the amount, or cancel. One-off donations don't
 * need this — nothing to manage.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const service = createSupabaseServiceClient();
  // Find the most recent monthly donation for this user to get the customer id.
  const { data: donation } = await service
    .from("donations")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .eq("kind", "monthly")
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!donation?.stripe_customer_id) {
    return NextResponse.json({ error: "no_monthly_subscription" }, { status: 404 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: donation.stripe_customer_id,
    return_url: `${appUrl}/dashboard/support`,
  });

  return NextResponse.json({ url: portal.url });
}
