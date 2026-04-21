import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { TrustBadge } from "@/components/trust-badge";
import type { TrustTier } from "@vetly/shared";

export const dynamic = "force-dynamic";

export default async function DomainIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const tierFilter = params.tier as TrustTier | undefined;

  const service = createSupabaseServiceClient();
  let query = service
    .from("domain_reputations")
    .select("domain, tier, score, last_assessed, source")
    .order("domain", { ascending: true })
    .limit(100);
  if (q) query = query.ilike("domain", `%${q}%`);
  if (tierFilter) query = query.eq("tier", tierFilter);
  const { data: rows } = await query;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Domain ratings</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Vetly scores publishers on a transparent rubric — methodology is <Link href="/methodology" className="underline">here</Link>.
        Search any domain. Full database is {"~"}100k entries; shown here are the top matches for your query.
      </p>

      <form className="mt-6 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="example.com"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select name="tier" defaultValue={tierFilter ?? ""} className="rounded-md border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="">Any tier</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="unknown">Unknown</option>
        </select>
        <button type="submit" className="rounded-md bg-vetly-green px-4 py-2 text-sm font-medium text-white">Search</button>
      </form>

      <ul className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
        {(rows ?? []).length === 0 && <li className="py-6 text-sm text-slate-500">No matches.</li>}
        {rows?.map((r) => (
          <li key={r.domain} className="py-3 flex items-center justify-between">
            <div>
              <Link href={`/domain/${r.domain}`} className="font-mono text-sm font-semibold hover:underline">{r.domain}</Link>
              <div className="text-xs text-slate-500 mt-0.5">Source: {r.source} · last reviewed {r.last_assessed ? new Date(r.last_assessed).toLocaleDateString() : "—"}</div>
            </div>
            <TrustBadge tier={r.tier as TrustTier} />
          </li>
        ))}
      </ul>
    </main>
  );
}
