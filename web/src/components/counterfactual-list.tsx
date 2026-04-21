import type { Counterfactual } from "@vetly/shared";

export function CounterfactualList({ items }: { items: Counterfactual[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
      <h3 className="font-semibold">How this page could score higher</h3>
      <p className="mt-1 text-sm text-slate-500">
        Counterfactual explanations: if the publisher changed one thing, how much would the score move?
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((c) => (
          <li key={c.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{c.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{c.suggestion}</div>
            </div>
            <div className={`text-sm font-mono shrink-0 ${c.delta_score >= 0 ? "text-vetly-green" : "text-vetly-red"}`}>
              {c.delta_score >= 0 ? "+" : ""}{(c.delta_score * 100).toFixed(1)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
