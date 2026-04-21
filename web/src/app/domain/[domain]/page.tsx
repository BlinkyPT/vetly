import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { TrustBadge } from "@/components/trust-badge";
import type { TrustTier } from "@vetly/shared";

export const dynamic = "force-dynamic";

export default async function DomainPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: raw } = await params;
  const domain = decodeURIComponent(raw).toLowerCase().replace(/^www\./, "");

  const service = createSupabaseServiceClient();

  const [{ data: rep }, { data: recent }, { data: disputes }] = await Promise.all([
    service.from("domain_reputations").select("*").eq("domain", domain).maybeSingle(),
    service.from("page_assessments")
      .select("url_hash, url, score, ai_probability, assessed_at")
      .ilike("url", `%${domain}%`)
      .order("assessed_at", { ascending: false })
      .limit(10),
    service.from("disputes").select("id, status, grounds, created_at").eq("target_kind", "domain").eq("target_value", domain).order("created_at", { ascending: false }).limit(5),
  ]);

  if (!rep) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold font-mono">{domain}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">We don&apos;t yet have a rating for this domain. You can request one by running an assessment of a specific page:</p>
        <Link href={`/assess?url=https://${domain}`} className="mt-4 inline-block rounded-md bg-vetly-green px-4 py-2 text-sm font-medium text-white">Assess a page from {domain}</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold font-mono">{domain}</h1>
        <TrustBadge tier={rep.tier as TrustTier} size="lg" />
      </div>

      <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-baseline justify-between">
          <div className="text-sm uppercase tracking-wide text-slate-500">Vetly score</div>
          <div className="text-3xl font-semibold">{Math.round(Number(rep.score) * 100)} / 100</div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">Source</dt><dd>{rep.source}</dd></div>
          <div><dt className="text-slate-500">Last reviewed</dt><dd>{rep.last_assessed ? new Date(rep.last_assessed).toLocaleDateString() : "—"}</dd></div>
        </dl>
        {rep.signals && Object.keys(rep.signals).length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">Signal details</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3 text-xs dark:bg-slate-900">{JSON.stringify(rep.signals, null, 2)}</pre>
          </details>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold">Recent page assessments from this domain</h2>
        {(recent ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {recent!.map((p) => (
              <li key={p.url_hash} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <Link href={`/a/${p.url_hash}`} className="text-sm hover:underline truncate block max-w-md">{p.url}</Link>
                  <div className="text-xs text-slate-500">AI-probability {(Number(p.ai_probability ?? 0) * 100).toFixed(0)}% · {new Date(p.assessed_at).toLocaleDateString()}</div>
                </div>
                <div className="text-sm font-mono">{Math.round(Number(p.score) * 100)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Disputes</h2>
        {(disputes ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No disputes filed against this rating.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {disputes!.map((d) => (
              <li key={d.id} className="rounded border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex justify-between"><strong>Status: {d.status}</strong><span className="text-slate-500">{new Date(d.created_at).toLocaleDateString()}</span></div>
                <p className="mt-1">{d.grounds.slice(0, 300)}{d.grounds.length > 300 ? "…" : ""}</p>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/disputes?target_kind=domain&target_value=${domain}`} className="mt-3 inline-block text-sm underline">File a dispute about this rating</Link>
      </section>
    </main>
  );
}
