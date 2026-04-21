"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DisputesPage() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    target_kind: (params.get("target_kind") as "domain" | "page") ?? "domain",
    target_value: params.get("target_value") ?? "",
    submitter_email: "",
    submitter_name: "",
    relationship: "reader" as "publisher" | "author" | "reader" | "other",
    grounds: "",
    evidence_url: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const payload = {
      ...form,
      evidence_url: form.evidence_url || undefined,
      submitter_email: form.submitter_email || undefined,
      submitter_name: form.submitter_name || undefined,
    };
    const res = await fetch("/api/disputes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (res.ok) setStatus("sent");
    else {
      const body = await res.json();
      setError(body.message ?? body.error ?? "Submission failed");
      setStatus("error");
    }
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm((s) => ({ ...s, [k]: v })); }

  if (status === "sent") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Dispute filed.</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Thank you — we&apos;ll review it. Disputes are resolved within 14 days and the resolution is published on the target&apos;s page (without your name or email).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold">File a dispute</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Every Vetly rating is open to review. If you believe a rating is wrong, tell us why and link evidence. We publish the outcome whether your dispute is upheld or rejected.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium">Target</label>
          <div className="mt-1 flex gap-2">
            <select value={form.target_kind} onChange={(e) => set("target_kind", e.target.value as "domain" | "page")} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="domain">Domain</option>
              <option value="page">Page (url_hash)</option>
            </select>
            <input
              required
              value={form.target_value}
              onChange={(e) => set("target_value", e.target.value)}
              placeholder={form.target_kind === "domain" ? "example.com" : "64-char url hash"}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Your relationship to this target</label>
          <select value={form.relationship} onChange={(e) => set("relationship", e.target.value as typeof form.relationship)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="publisher">Publisher</option>
            <option value="author">Author</option>
            <option value="reader">Reader</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Grounds (what&apos;s wrong, in your view)</label>
          <textarea
            required
            rows={6}
            minLength={20}
            value={form.grounds}
            onChange={(e) => set("grounds", e.target.value)}
            placeholder="Be specific. Point to which signal is wrong and cite evidence."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Evidence URL (optional)</label>
          <input
            type="url"
            value={form.evidence_url}
            onChange={(e) => set("evidence_url", e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Your name (optional)</label>
            <input value={form.submitter_name} onChange={(e) => set("submitter_name", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium">Email (optional, for follow-up)</label>
            <input type="email" value={form.submitter_email} onChange={(e) => set("submitter_email", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          </div>
        </div>

        {error && <p className="text-sm text-vetly-red">{error}</p>}
        <button type="submit" disabled={status === "sending"} className="rounded-md bg-vetly-green px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60">
          {status === "sending" ? "Submitting…" : "File dispute"}
        </button>
      </form>
    </main>
  );
}
