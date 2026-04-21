import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { TrustBadge } from "@/components/trust-badge";
import { SignalList } from "@/components/signal-list";
import type { PageAssessment } from "@vetly/shared";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const { hash } = await params;
  const service = createSupabaseServiceClient();
  const { data } = await service.from("page_assessments").select("url, score, full").eq("url_hash", hash).maybeSingle();
  if (!data) return { title: "Vetly assessment" };
  const a = data.full as PageAssessment;
  return {
    title: `Vetly: ${Math.round(Number(data.score) * 100)}/100 · ${new URL(a.url).hostname}`,
    description: `Source-trust assessment of ${a.url}`,
    openGraph: {
      title: `Vetly assessment: ${Math.round(Number(data.score) * 100)}/100 · ${new URL(a.url).hostname}`,
      type: "article",
    },
  };
}

export default async function PermalinkPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const service = createSupabaseServiceClient();
  const { data } = await service.from("page_assessments").select("*").eq("url_hash", hash).maybeSingle();
  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">No assessment found for this hash.</h1>
        <p className="mt-2"><Link href="/assess" className="underline">Assess a URL →</Link></p>
      </main>
    );
  }
  const assessment = data.full as PageAssessment;
  const domain = new URL(assessment.url).hostname.replace(/^www\./, "");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{new URL(assessment.url).pathname || "/"}</h1>
          <Link href={`/domain/${domain}`} className="text-sm text-slate-500 hover:underline">{domain}</Link>
        </div>
        <TrustBadge tier={assessment.tier} size="lg" />
      </header>

      <a href={assessment.url} target="_blank" rel="noreferrer" className="block text-xs text-slate-500 underline truncate">{assessment.url}</a>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Vetly score" value={`${Math.round(assessment.score * 100)} / 100`} />
        <Metric label="AI-content probability" value={`${Math.round(assessment.llm.ai_probability * 100)}%`} />
        <Metric label="Citations" value={String(assessment.heuristic.citation_count)} />
      </div>

      <section>
        <h2 className="text-lg font-semibold">Signals</h2>
        <p className="text-sm text-slate-500 mt-1">Every signal that contributed to the score, with its raw value, its weight, and its contribution.</p>
        <div className="mt-4">
          <SignalList signals={assessment.weighted_signals} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 p-5 dark:border-slate-800 text-sm">
        <h3 className="font-semibold">Disagree with this rating?</h3>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Every rating is open to dispute. If you&apos;re the author, publisher, or a reader who thinks the score is wrong, tell us.
        </p>
        <Link href={`/disputes?target_kind=page&target_value=${assessment.url_hash}`} className="mt-3 inline-block rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700">
          File a dispute
        </Link>
      </section>

      <footer className="text-xs text-slate-500">
        Assessed {new Date(assessment.assessed_at).toLocaleString()}. Methodology: <Link href="/methodology" className="underline">here</Link>.
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
