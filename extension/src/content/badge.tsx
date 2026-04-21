import { createRoot, type Root } from "react-dom/client";
import type { TrustTier } from "@vetly/shared";

const TIER_STYLE: Record<TrustTier, { bg: string; ring: string; label: string; title: string }> = {
  high:    { bg: "#1f9d55", ring: "#14532d", label: "✓", title: "High-trust source" },
  medium:  { bg: "#d97706", ring: "#78350f", label: "~", title: "Medium-trust source" },
  low:     { bg: "#dc2626", ring: "#7f1d1d", label: "!", title: "Low-trust source" },
  unknown: { bg: "#6b7280", ring: "#374151", label: "?", title: "Unknown source" },
};

export type BadgeProps = {
  tier: TrustTier;
  reason: string;
  onClick: () => void;
};

function Badge({ tier, reason, onClick }: BadgeProps) {
  const s = TIER_STYLE[tier];
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      title={`${s.title} — ${reason}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginLeft: 8,
        height: 20,
        padding: "0 8px",
        borderRadius: 999,
        background: s.bg,
        color: "white",
        border: `1px solid ${s.ring}`,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
        cursor: "pointer",
        verticalAlign: "middle",
      }}
    >
      <span aria-hidden>{s.label}</span>
      <span>Vetly</span>
    </button>
  );
}

export type BadgeHost = {
  host: HTMLElement;
  root: Root;
  update: (props: BadgeProps) => void;
  destroy: () => void;
};

/**
 * Mount a badge in a shadow-DOM host placed after `anchor`. Shadow DOM isolates
 * our styling from Google's — Google cannot accidentally restyle our badge and
 * we cannot leak into their styles.
 */
export function mountBadge(anchor: HTMLElement, initial: BadgeProps): BadgeHost {
  const host = document.createElement("span");
  host.setAttribute("data-vetly-badge", "");
  host.style.display = "inline-block";
  const shadow = host.attachShadow({ mode: "open" });
  const mount = document.createElement("span");
  shadow.appendChild(mount);

  const root = createRoot(mount);
  root.render(<Badge {...initial} />);

  anchor.insertAdjacentElement("afterend", host);

  return {
    host,
    root,
    update: (next) => root.render(<Badge {...next} />),
    destroy: () => { root.unmount(); host.remove(); },
  };
}
