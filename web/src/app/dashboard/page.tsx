import Link from "next/link";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { ANTI_ABUSE_LIMITS } from "@vetly/shared";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createSupabaseServiceClient();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const { data: usage } = await service
    .from("usage")
    .select("page_assessments_count")
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())
    .maybeSingle();
  const used = usage?.page_assessments_count ?? 0;

  const { data: donations } = await service
    .from("donations")
    .select("amount_cents")
    .eq("user_id", user.id)
    .eq("status", "succeeded");
  const totalGiven = (donations ?? []).reduce((s, d) => s + (d.amount_cents ?? 0), 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Welcome back.</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Install the extension in Chrome and start searching. Every Google result will get a trust badge.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Today's deep assessments" value={`${used} / ${ANTI_ABUSE_LIMITS.deep_assessments_per_day}`} />
        <Stat label="Your total donated" value={totalGiven > 0 ? `$${(totalGiven / 100).toFixed(2)}` : "—"} />
        <Stat label="Extension" value="Chrome" />
      </section>

      <section className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="font-semibold">Vetly is free — and donation-supported</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every feature is available to everyone. The daily cap on deep assessments is purely to prevent abuse.
          If Vetly is useful to you, you can chip in whatever you like.
        </p>
        <Link href="/dashboard/support" className="mt-3 inline-block rounded-md bg-vetly-green px-3 py-1.5 text-sm font-medium text-white">
          Support Vetly
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
