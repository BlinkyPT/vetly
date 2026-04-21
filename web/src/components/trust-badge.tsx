import type { TrustTier } from "@vetly/shared";

const STYLES: Record<TrustTier, { bg: string; label: string }> = {
  high:    { bg: "bg-vetly-green", label: "High trust" },
  medium:  { bg: "bg-vetly-amber", label: "Mixed / medium" },
  low:     { bg: "bg-vetly-red",   label: "Low trust" },
  unknown: { bg: "bg-vetly-grey",  label: "Unknown" },
};

export function TrustBadge({ tier, size = "md" }: { tier: TrustTier; size?: "sm" | "md" | "lg" }) {
  const s = STYLES[tier];
  const cls = size === "lg" ? "text-base px-3 py-1"
           : size === "sm" ? "text-[10px] px-1.5 py-0.5"
           : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center rounded-full text-white font-medium ${s.bg} ${cls}`}>
      {s.label}
    </span>
  );
}
