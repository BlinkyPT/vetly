/**
 * Plots the point-estimate score with a ±1 SEM band. Not statistically
 * precise for asymmetric intervals (since θ→score is monotone-nonlinear)
 * but visually honest about the uncertainty around the reported score.
 */
export function UncertaintyBar({ score, sem, certainty }: { score: number; sem: number; certainty: number }) {
  const pct = Math.round(score * 100);
  // Approximate half-width by mapping sem (on θ scale, typically 0.1-0.5) to score units.
  const halfWidth = Math.min(25, Math.max(3, sem * 18));
  const left = Math.max(0, pct - halfWidth);
  const right = Math.min(100, pct + halfWidth);
  return (
    <div>
      <div className="relative h-3 rounded-full bg-slate-100 dark:bg-slate-900">
        <div
          className="absolute top-0 h-full rounded-full bg-vetly-green/30"
          style={{ left: `${left}%`, width: `${right - left}%` }}
          aria-hidden
        />
        <div
          className="absolute top-0 h-full w-[3px] rounded-full bg-vetly-green"
          style={{ left: `calc(${pct}% - 1.5px)` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>Score: <strong className="tabular-nums">{pct} ± {Math.round(halfWidth)}</strong></span>
        <span>Tier certainty: <strong className="tabular-nums">{Math.round(certainty * 100)}%</strong></span>
      </div>
    </div>
  );
}
