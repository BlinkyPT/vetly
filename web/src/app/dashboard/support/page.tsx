import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { SUGGESTED_DONATION_AMOUNTS_CENTS } from "@vetly/shared";
import { SupportActions } from "./actions";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createSupabaseServiceClient();
  const { data: donations } = await service
    .from("donations")
    .select("amount_cents, currency, kind, created_at, status")
    .eq("user_id", user.id)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false });

  const params = await searchParams;
  const banner = params?.donation ?? null;

  const totalGiven = (donations ?? []).reduce((sum, d) => sum + (d.amount_cents ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Support Vetly</h1>
      <p className="text-slate-600 dark:text-slate-300">
        Vetly is free for everyone — there is no paid tier and no feature is gated behind payment. We believe a trust signal on search results is a public good.
        If Vetly is useful to you, you can chip in whatever you like. It helps cover the LLM calls that power deep assessments.
      </p>

      {banner === "thanks" && (
        <div className="rounded-md border border-vetly-green bg-vetly-green/10 p-3 text-sm">
          Thank you — your donation went through. You&apos;re helping keep Vetly free for everyone.
        </div>
      )}
      {banner === "cancelled" && (
        <div className="rounded-md border border-slate-300 p-3 text-sm">
          No worries — no charge was made. Vetly stays fully available to you either way.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="font-semibold">One-off donation</h2>
        <p className="mt-1 text-sm text-slate-500">Pay once, in US dollars. Secure checkout via Stripe.</p>
        <SupportActions
          suggestedAmounts={[...SUGGESTED_DONATION_AMOUNTS_CENTS]}
          mode="one_off"
        />
      </div>

      <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="font-semibold">Become a monthly supporter</h2>
        <p className="mt-1 text-sm text-slate-500">Optional — a small recurring contribution. Cancel any time from Stripe.</p>
        <SupportActions
          suggestedAmounts={[300, 500, 1000]}
          mode="monthly"
        />
      </div>

      <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="font-semibold">Your donation history</h2>
        {totalGiven > 0 && (
          <p className="mt-1 text-sm text-slate-500">Total given so far: <strong>${(totalGiven / 100).toFixed(2)}</strong>. Thank you.</p>
        )}
        <ul className="mt-3 space-y-2 text-sm">
          {(!donations || donations.length === 0) && (
            <li className="text-slate-500">No donations yet — and that&apos;s fine. Vetly works the same for you.</li>
          )}
          {donations?.map((d, i) => (
            <li key={i} className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <span>${(d.amount_cents / 100).toFixed(2)} {d.currency?.toUpperCase()} · {d.kind}</span>
              <span className="text-slate-500">{new Date(d.created_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
