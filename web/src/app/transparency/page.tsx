import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vetly — transparency dashboard" };

type PublicStats = {
  domains_rated: number;
  pages_assessed: number;
  feedback_submitted: number;
  disputes_open: number;
  donations_30d_cents: number;
  donations_total_cents: number;
  assessments_30d: number;
};

export default async function TransparencyPage() {
  const service = createSupabaseServiceClient();
  const { data } = await service.from("public_stats").select("*").maybeSingle();
  const s = (data as PublicStats | null) ?? {
    domains_rated: 0, pages_assessed: 0, feedback_submitted: 0, disputes_open: 0,
    donations_30d_cents: 0, donations_total_cents: 0, assessments_30d: 0,
  };

  // Rough LLM cost estimate: assume Haiku ~$0.002/call averaged across input+output.
  const llmEstimate30d = s.assessments_30d * 0.002;
  const llmEstimateDollars = `$${llmEstimate30d.toFixed(2)}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Transparency</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          What Vetly costs to run, what it brings in, and how many people use it.
          This page is generated live from the database. No edits.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Domains rated" value={s.domains_rated.toLocaleString()} />
        <Stat label="Pages assessed" value={s.pages_assessed.toLocaleString()} />
        <Stat label="Feedback submitted" value={s.feedback_submitted.toLocaleString()} />
        <Stat label="Open disputes" value={s.disputes_open.toLocaleString()} />
      </section>

      <section className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="text-lg font-semibold">Last 30 days</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <Pair label="Assessments served" value={s.assessments_30d.toLocaleString()} />
          <Pair label="Estimated LLM cost" value={llmEstimateDollars} />
          <Pair label="Donations received" value={`$${(s.donations_30d_cents / 100).toFixed(2)}`} />
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          LLM cost is estimated at roughly $0.002 per deep assessment (Claude Haiku 4.5 through the Vercel AI Gateway).
          Actual billed amount is reconciled monthly; any discrepancy we&apos;ll note here.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
        <h2 className="text-lg font-semibold">All time</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <Pair label="Donations received" value={`$${(s.donations_total_cents / 100).toFixed(2)}`} />
        </dl>
      </section>

      <section className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Principles</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Every metric on this page is a live read from Supabase, not a curated number.</li>
          <li>We will never sell user data. Our only revenue is donations.</li>
          <li>If monthly donations fall below monthly cost, we&apos;ll say so clearly on this page and explain what we&apos;re cutting.</li>
          <li>Surplus from donations goes first into a 3-month runway buffer, then into raising the deep-assessment cap.</li>
        </ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
function Pair({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500 text-xs">{label}</dt><dd className="text-lg font-semibold">{value}</dd></div>;
}
