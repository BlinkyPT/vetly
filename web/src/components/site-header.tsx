import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-vetly-green text-white text-sm font-bold">V</span>
          Vetly
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/assess" className="hover:underline">Assess a URL</Link>
          <Link href="/explore" className="hover:underline">Explore</Link>
          <Link href="/methodology" className="hover:underline">Methodology</Link>
          <Link href="/transparency" className="hover:underline">Transparency</Link>
          <Link href="/dashboard" className="rounded-md bg-vetly-green px-3 py-1 text-white">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500">
        <p>Vetly — source-trust signals for the open web. Free for everyone.</p>
        <div className="flex gap-4">
          <Link href="/methodology" className="hover:underline">Methodology</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/disputes" className="hover:underline">Disputes</Link>
          <Link href="/transparency" className="hover:underline">Transparency</Link>
        </div>
      </div>
    </footer>
  );
}
