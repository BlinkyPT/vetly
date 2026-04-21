import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-vetly-green text-white font-bold">
          V
        </span>
        <span className="text-xl font-semibold tracking-tight">Vetly</span>
      </header>

      <section className="mt-12">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Know which search results you can trust.
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Vetly adds a small <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-vetly-green" /> green</span>
          {" / "}
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-vetly-amber" /> amber</span>
          {" / "}
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-vetly-red" /> red</span>
          {" "}badge to every Google result so you can tell AI-generated spam, low-quality SEO farms,
          and real journalism apart in a glance. Click any badge to see why.
        </p>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          <strong>Free for everyone.</strong> Vetly is donation-supported — no paywalled features, no accounts required to use the basic badge, no ads. A trust signal on search results is a public good.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth/sign-up"
            className="rounded-md bg-vetly-green px-4 py-2 font-medium text-white hover:opacity-90"
          >
            Create account
          </Link>
          <Link
            href="/auth/sign-in"
            className="rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        <Card title="Instant badge on every SERP">
          ~100k domains bundled with the extension, so the badge paints in the same frame as Google&apos;s results — no waiting on a network call.
        </Card>
        <Card title="Deep per-page assessment">
          Click a result and Vetly quietly scores the landing page: AI-content probability, citation density, byline, freshness, ad-to-content ratio.
        </Card>
        <Card title="Methodology you can audit">
          Every badge click opens a panel showing every signal, its value, and its weight. No black boxes.
        </Card>
        <Card title="Signal, not gate">
          Vetly never hides or reorders results. You stay in control.
        </Card>
      </section>

      <section className="mt-16 rounded-lg border border-vetly-green/40 bg-vetly-green/5 p-6">
        <h2 className="text-lg font-semibold">Donation-supported, not ad-supported</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          The LLM calls that power deep assessments cost real money. If Vetly is useful to you, chip in whatever you like — one-off or monthly. We will never sell your data, show ads, or lock features behind a paywall.
        </p>
        <Link
          href="/auth/sign-up"
          className="mt-3 inline-block rounded-md bg-vetly-green px-3 py-1.5 text-sm font-medium text-white"
        >
          Create an account to donate
        </Link>
      </section>

      <footer className="mt-20 text-sm text-slate-500">
        Vetly is a privacy-respecting Chrome extension. Page content is only sent to our server when you open a deep assessment.
        See our <Link href="/privacy" className="underline">privacy policy</Link>.
      </footer>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-5 dark:border-slate-800">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}
