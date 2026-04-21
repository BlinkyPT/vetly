import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { TrustBadge } from "@/components/trust-badge";
import type { TrustTier } from "@vetly/shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vetly — explore recent assessments" };

export default async function ExplorePage() {
  const service = createSupabaseServiceClient();

  const [{ data: recent }, { data: disputed }, { data: lowTrust }] = await Promise.all([
    service.from("page_assessments")
      .select("url_hash, url, score, ai_probability, assessed_at")
      .order("assessed_at", { ascending: false })
      .limit(15),
    service.from("disputes")
      .select("id, target_kind, target_value, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    service.from("page_assessments")
      .select("url_hash, url, score, ai_probability, assessed_at")
      .lt("score", 0.45)
      .order("assessed_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Explore</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Recent assessments, disputed ratings, and the lowest-scoring pages we&apos;ve seen this week.</p>
      </header>

      <Section title="Most recent assessments">
        <AssessmentList rows={recent ?? []} />
      </Section>

      <Section title="Recent disputes">
        {(disputed ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No disputes yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {disputed!.map((d) => (
              <li key={d.id} className="py-3 flex items-center justify-between">
                <Link href={d.target_kind === "domain" ? `/domain/${d.target_value}` : `/a/${d.target_value}`} className="text-sm hover:underline truncate max-w-md">
                  {d.target_kind}: {d.target_value}
                </Link>
                <div className="text-xs text-slate-500">{d.status} · {new Date(d.created_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Lowest-scoring pages recently">
        <AssessmentList rows={lowTrust ?? []} />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AssessmentList({ rows }: { rows: Array<{ url_hash: string; url: string; score: number; ai_probability: number | null; assessed_at: string }> }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">None yet.</p>;
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((r) => {
        const tier: TrustTier = Number(r.score) >= 0.7 ? "high" : Number(r.score) >= 0.45 ? "medium" : "low";
        const domain = (() => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return r.url; } })();
        return (
          <li key={r.url_hash} className="py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link href={`/a/${r.url_hash}`} className="text-sm hover:underline truncate block max-w-xl">{r.url}</Link>
              <div className="text-xs text-slate-500 mt-0.5">
                <Link href={`/domain/${domain}`} className="hover:underline">{domain}</Link> · AI {(Number(r.ai_probability ?? 0) * 100).toFixed(0)}% · {new Date(r.assessed_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TrustBadge tier={tier} size="sm" />
              <div className="text-sm font-mono w-10 text-right">{Math.round(Number(r.score) * 100)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
