import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import type { PageAssessment, TrustTier, WeightedSignal } from "@vetly/shared";
import { sendToBackground } from "@/lib/messaging";

const TIER_COLOUR: Record<TrustTier, string> = {
  high: "#1f9d55",
  medium: "#d97706",
  low: "#dc2626",
  unknown: "#6b7280",
};

export type PanelProps = {
  url: string;
  domain: string;
  tier: TrustTier;
  seedReason: string;
  assessment?: PageAssessment;
  onClose: () => void;
  /** Optional — deep assessment only makes sense on the actual content page, not from a SERP. */
  onRequestDeepAssessment?: () => Promise<void>;
  onFeedback?: (thumbs: "up" | "down", notes?: string) => Promise<void>;
};

function Panel(props: PanelProps) {
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<"up" | "down" | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") props.onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const a = props.assessment;

  async function deepAssess() {
    if (!props.onRequestDeepAssessment) return;
    setDeepLoading(true);
    setDeepError(null);
    try { await props.onRequestDeepAssessment(); }
    catch (e) { setDeepError((e as Error).message); }
    finally { setDeepLoading(false); }
  }

  async function sendFeedback(thumbs: "up" | "down") {
    if (!props.onFeedback) return;
    await props.onFeedback(thumbs, notes || undefined);
    setFeedbackSent(thumbs);
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Vetly methodology">
      <div style={cardStyle}>
        <header style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...pillStyle, background: TIER_COLOUR[props.tier] }}>{props.tier}</span>
            <strong style={{ fontSize: 14 }}>{props.domain}</strong>
          </div>
          <button onClick={props.onClose} style={closeBtn} aria-label="Close">×</button>
        </header>

        <p style={{ fontSize: 13, color: "#334155", margin: "6px 0 12px" }}>{props.seedReason}</p>

        {!a && props.onRequestDeepAssessment && (
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <p style={{ fontSize: 13, margin: 0 }}>
              Vetly can also do a deep assessment of the article itself: AI-generated-content probability, citations, byline, freshness, bias markers.
            </p>
            <button onClick={deepAssess} disabled={deepLoading} style={primaryBtn}>
              {deepLoading ? "Assessing…" : "Run deep assessment"}
            </button>
            {deepError && <p style={{ color: "#dc2626", fontSize: 12 }}>{deepError}</p>}
          </div>
        )}
        {!a && !props.onRequestDeepAssessment && (
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              Click through to the page, then click the Vetly icon in your toolbar to run a deep assessment.
            </p>
          </div>
        )}

        {a && (
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "#334155" }}>Deep-assessment score</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: TIER_COLOUR[a.tier] }}>{Math.round(a.score * 100)}</div>
            </div>

            <h4 style={{ margin: "16px 0 6px", fontSize: 12, textTransform: "uppercase", color: "#64748b" }}>Signals</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {a.weighted_signals.map((s) => <SignalRow key={s.key} signal={s} />)}
            </ul>

            {props.onFeedback && (
              <>
                <h4 style={{ margin: "16px 0 6px", fontSize: 12, textTransform: "uppercase", color: "#64748b" }}>Was this useful?</h4>
                <textarea
                  placeholder="Optional comment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ width: "100%", fontSize: 12, padding: 6, border: "1px solid #e2e8f0", borderRadius: 6, fontFamily: "system-ui", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button disabled={!!feedbackSent} onClick={() => sendFeedback("up")}   style={{ ...secondaryBtn, borderColor: feedbackSent === "up"   ? "#1f9d55" : "#e2e8f0" }}>👍 Accurate</button>
                  <button disabled={!!feedbackSent} onClick={() => sendFeedback("down")} style={{ ...secondaryBtn, borderColor: feedbackSent === "down" ? "#dc2626" : "#e2e8f0" }}>👎 Off</button>
                  {feedbackSent && <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>Thanks — saved.</span>}
                </div>
              </>
            )}
          </div>
        )}

        <footer style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 8, fontSize: 11, color: "#64748b" }}>
          Signal, not gate. Vetly annotates; it never hides results.
        </footer>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: WeightedSignal }) {
  const bar = Math.round(Math.abs(signal.contribution) * 100);
  const pos = signal.contribution >= 0;
  return (
    <li style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{signal.label}</span>
        <span style={{ fontSize: 12, color: pos ? "#1f9d55" : "#dc2626" }}>
          {pos ? "+" : ""}{(signal.contribution * 100).toFixed(1)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        Value: <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 4 }}>{String(signal.value)}</code>
        {" · "}Weight: {signal.weight.toFixed(2)}
      </div>
      {signal.evidence && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{signal.evidence}</div>}
      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${bar}%`, background: pos ? "#1f9d55" : "#dc2626" }} />
      </div>
    </li>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
  zIndex: 2147483647, display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: "72px 16px", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
};
const cardStyle: React.CSSProperties = {
  background: "white", color: "#0f172a", borderRadius: 12, width: "100%", maxWidth: 460,
  boxShadow: "0 30px 60px -15px rgba(15,23,42,0.35)", padding: 16, maxHeight: "80vh", overflow: "auto",
};
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 };
const pillStyle: React.CSSProperties = { color: "white", fontSize: 10, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 };
const closeBtn: React.CSSProperties = { background: "transparent", border: 0, fontSize: 24, lineHeight: 1, cursor: "pointer", color: "#64748b" };
const primaryBtn: React.CSSProperties = { marginTop: 10, padding: "8px 14px", background: "#1f9d55", color: "white", border: 0, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { padding: "6px 10px", background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, cursor: "pointer" };

let current: { host: HTMLElement; close: () => void } | null = null;

export function openMethodologyPanel(props: Omit<PanelProps, "onClose"> & { onClose?: () => void }) {
  if (current) current.close();
  const host = document.createElement("div");
  host.setAttribute("data-vetly-panel", "");
  const shadow = host.attachShadow({ mode: "open" });
  const mount = document.createElement("div");
  shadow.appendChild(mount);
  document.body.appendChild(host);
  const root = createRoot(mount);

  function close() {
    root.unmount();
    host.remove();
    current = null;
    props.onClose?.();
  }

  root.render(<Panel {...props} onClose={close} />);
  current = { host, close };
}
