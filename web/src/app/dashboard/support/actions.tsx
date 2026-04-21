"use client";
import { useState } from "react";

export function SupportActions({ suggestedAmounts, mode }: { suggestedAmounts: number[]; mode: "one_off" | "monthly" }) {
  const [selected, setSelected] = useState<number>(suggestedAmounts[1] ?? suggestedAmounts[0]!);
  const [custom, setCustom] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function donate() {
    setLoading(true);
    const customCents = custom ? Math.round(parseFloat(custom) * 100) : NaN;
    const amount_cents = Number.isFinite(customCents) && customCents >= 100 ? customCents : selected;
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_cents, mode }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {suggestedAmounts.map((cents) => (
          <button
            key={cents}
            onClick={() => { setSelected(cents); setCustom(""); }}
            className={`rounded-md border px-3 py-1.5 text-sm ${selected === cents && !custom ? "border-vetly-green bg-vetly-green/10 font-semibold" : "border-slate-300 dark:border-slate-700"}`}
          >
            ${(cents / 100).toFixed(0)}{mode === "monthly" ? "/mo" : ""}
          </button>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Or $</span>
          <input
            type="number"
            step="0.50"
            min={1}
            placeholder="custom"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>
      <button
        onClick={donate}
        disabled={loading}
        className="rounded-md bg-vetly-green px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Opening checkout…" : mode === "monthly" ? "Become a monthly supporter" : "Donate"}
      </button>
    </div>
  );
}
