import type { WeightedSignal } from "@vetly/shared";

export function SignalList({ signals }: { signals: WeightedSignal[] }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {signals.map((s) => <Row key={s.key} signal={s} />)}
    </ul>
  );
}

function Row({ signal }: { signal: WeightedSignal }) {
  const pos = signal.contribution >= 0;
  const bar = Math.round(Math.abs(signal.contribution) * 100 * 4); // magnify for visibility
  return (
    <li className="py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{signal.label}</div>
        <div className={`text-xs font-mono ${pos ? "text-vetly-green" : "text-vetly-red"}`}>
          {pos ? "+" : ""}{(signal.contribution * 100).toFixed(1)}
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">
        Value: <code className="rounded bg-slate-100 px-1 dark:bg-slate-900">{String(signal.value)}</code> · weight: {signal.weight.toFixed(2)}
      </div>
      {signal.evidence && <div className="text-xs text-slate-600 mt-1 dark:text-slate-400">{signal.evidence}</div>}
      <div className="h-1 mt-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-900">
        <div className={`h-full ${pos ? "bg-vetly-green" : "bg-vetly-red"}`} style={{ width: `${Math.min(100, bar)}%` }} />
      </div>
    </li>
  );
}
