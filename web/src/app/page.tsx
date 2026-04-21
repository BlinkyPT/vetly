import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <section>
        <h1 className="text-5xl font-semibold tracking-tight text-balance">
          Source-trust signals for the open web.
        </h1>
        <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
          Vetly rates publishers and pages on a <Link href="/methodology" className="underline">transparent rubric</Link> — green / amber / red —
          with every signal exposed. Free for everyone, donation-supported, no ads, no selling data. A trust signal on the web is a public good.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/assess" className="rounded-md bg-vetly-green px-5 py-2.5 font-medium text-white hover:opacity-90">Assess a URL</Link>
          <Link href="/domain" className="rounded-md border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">Browse rated domains</Link>
          <Link href="/auth/sign-up" className="rounded-md border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">Create account</Link>
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        <Card title="Chrome extension" href="#extension">
          A green / amber / red badge next to every Google search result. Click the badge for the methodology panel. Paint-fast (~100k domains bundled).
        </Card>
        <Card title="Web assessment" href="/assess">
          Paste any URL. Vetly fetches the page, extracts the article, and scores it in 10–20 seconds. Shareable permalink you can cite anywhere.
        </Card>
        <Card title="Domain database" href="/domain">
          Search ~100k rated publishers. Each domain page shows the tier, signals, dispute history, and recent pages we&apos;ve scored from that source.
        </Card>
        <Card title="Auditable methodology" href="/methodology">
          Every signal, every weight, every source of data, every dispute resolution. If it&apos;s in the score, it&apos;s on the page.
        </Card>
      </section>

      <section id="extension" className="mt-20 rounded-lg border border-slate-200 p-8 dark:border-slate-800">
        <h2 className="text-2xl font-semibold">The Chrome extension</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Install Vetly in Chrome (or any Chromium browser — Edge, Brave, Arc, Opera). Every Google result gets a badge. Click through to an article, hit the Vetly icon, and get a deep per-page assessment with signal-level transparency.
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Prefer stronger privacy? Enable <strong>BYOK</strong> in the extension settings: paste your own Anthropic key and Vetly will call Claude directly from your browser — page content never touches our server.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="https://chrome.google.com/webstore/detail/vetly" className="rounded-md bg-vetly-green px-4 py-2 text-sm font-medium text-white">Install for Chrome</a>
          <Link href="/methodology" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Read the methodology</Link>
        </div>
      </section>

      <section className="mt-20 rounded-lg border border-vetly-green/40 bg-vetly-green/5 p-8">
        <h2 className="text-2xl font-semibold">Donation-supported, not ad-supported</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          LLM calls cost real money. If Vetly is useful to you, chip in whatever you like — one-off or monthly. Every penny is <Link href="/transparency" className="underline">publicly accounted for</Link>. We will never sell your data, show ads, or lock features behind a paywall.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/support" className="rounded-md bg-vetly-green px-4 py-2 text-sm font-medium text-white">Support Vetly</Link>
          <Link href="/transparency" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">See our running costs</Link>
        </div>
      </section>

      <section className="mt-20 text-sm text-slate-500">
        <p><strong>Signal, not gate.</strong> Vetly never hides or re-orders results. You stay in control. Editorial judgement stays with the reader.</p>
      </section>
    </main>
  );
}

function Card({ title, children, href }: { title: string; children: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 p-5 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </Link>
  );
}
