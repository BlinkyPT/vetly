import type { FacetKey } from "@vetly/shared";

type FacetScore = { theta_mean: number; theta_sem: number; score: number; n_items: number };

const LABELS: Record<FacetKey, { title: string; blurb: string }> = {
  factual_rigour:      { title: "Factual rigour",       blurb: "Citation density, citation-graph tier, claim specificity." },
  editorial_integrity: { title: "Editorial integrity",  blurb: "Byline, AI-probability, bias markers, ad-to-content ratio." },
  temporal_currency:   { title: "Temporal currency",    blurb: "Freshness, locale consistency, language confidence." },
  authority_alignment: { title: "Authority alignment",  blurb: "Publisher tier, expertise fit, domain age, HTTPS." },
};

export function FacetGrid({ facets }: { facets: Record<FacetKey, FacetScore> }) {
  const keys = Object.keys(facets) as FacetKey[];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {keys.map((k) => {
        const f = facets[k];
        const pct = Math.round(f.score * 100);
        const semPct = Math.round(Math.min(0.3, f.theta_sem * 0.4) * 100);
        return (
          <div key={k} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-semibold">{LABELS[k].title}</div>
              <div className="text-lg font-semibold tabular-nums">
                {pct}
                <span className="ml-1 text-xs font-normal text-slate-500">± {semPct}</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-900">
              <div className="h-full rounded-full bg-vetly-green" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{LABELS[k].blurb}</p>
            <p className="mt-1 text-[11px] text-slate-400">{f.n_items} signal{f.n_items === 1 ? "" : "s"}</p>
          </div>
        );
      })}
    </div>
  );
}
