import { NextResponse } from "next/server";
import { DonationRequest } from "@vetly/shared";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = DonationRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });

  const { amount_cents, mode } = parsed.data;
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // One-off donations use `payment` mode; optional monthly supporter uses `subscription` mode.
  // Either way, nothing is gated behind a payment — donations are purely supportive.
  const session = await stripe.checkout.sessions.create({
    mode: mode === "monthly" ? "subscription" : "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        recurring: mode === "monthly" ? { interval: "month" } : undefined,
        product_data: { name: mode === "monthly" ? "Vetly monthly supporter" : "Vetly one-off donation" },
        unit_amount: amount_cents,
      },
      quantity: 1,
    }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, kind: mode },
    success_url: `${appUrl}/dashboard/support?donation=thanks`,
    cancel_url: `${appUrl}/dashboard/support?donation=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
