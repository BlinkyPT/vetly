"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AssessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState(searchParams.get("url") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assess-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Assessment failed");
        setLoading(false);
        return;
      }
      router.push(`/a/${data.assessment.url_hash}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Assess any URL</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Paste a URL. Vetly will fetch the page, extract the main article, and score it on our transparent rubric.
        You&apos;ll get a shareable permalink you can cite anywhere.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.nytimes.com/2026/…"
          className="w-full rounded-md border border-slate-300 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {error && <p className="text-sm text-vetly-red">{error}</p>}
        <button
          type="submit"
          disabled={loading || !url}
          className="rounded-md bg-vetly-green px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Assessing (this can take 10–20 seconds)…" : "Assess"}
        </button>
      </form>

      <section className="mt-10 space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">What Vetly measures</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Publisher tier from our bundled seed + community feedback.</li>
          <li>AI-generated-content probability (quotes cited as evidence).</li>
          <li>Citation density (links to primary sources, normalised for article length).</li>
          <li>Byline presence and named author.</li>
          <li>Publication freshness.</li>
          <li>Ad-to-content ratio.</li>
          <li>Editorial bias markers (partisan framing, unsupported claims, emotional loading, etc.).</li>
          <li>Expertise-to-topic fit.</li>
          <li>HTTPS validity + language / locale consistency.</li>
        </ul>
        <p className="pt-2">
          Every assessment is cached shared across users for 30 days, so the second person who assesses the same article pays no LLM cost — and helps keep Vetly free.
        </p>
      </section>
    </main>
  );
}
