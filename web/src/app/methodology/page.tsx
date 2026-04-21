import Link from "next/link";

export const metadata = { title: "Vetly methodology — how we score source trust" };

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-slate dark:prose-invert">
      <h1>Methodology</h1>
      <p>
        Vetly scores <strong>sources</strong>, not <strong>specific claims</strong>. That is a deliberate scope choice.
        Rating &quot;is the Daily Mail broadly a low-trust publisher?&quot; is observable and defensible.
        Rating &quot;is this specific sentence in this specific article true?&quot; is a much harder, much more legally-exposed,
        and much more easily-gamed problem. We leave per-claim fact-checking to Snopes, PolitiFact, and Full Fact.
      </p>

      <h2>Signal, not gate</h2>
      <p>
        Vetly never hides or re-orders results. It only annotates. Editorial judgement is kept with the reader.
        If you disagree with a rating, the methodology below tells you exactly what went into it, and every badge
        is <Link href="/disputes">disputable</Link>.
      </p>

      <h2>The score</h2>
      <p>
        Every page assessment produces a 0–100 score, grouped into four tiers:
      </p>
      <ul>
        <li><strong>High</strong> (70+): known authoritative publisher, current, cited, named author, sensible ad density, expert-to-topic fit.</li>
        <li><strong>Medium</strong> (45–69): mixed signals — e.g. a known publisher with a thin, unsourced article; or an unknown publisher scoring well on the heuristics.</li>
        <li><strong>Low</strong> (&lt;45): several negative signals combine — AI-written, no byline, known low-trust domain, high ad load, partisan framing without sourcing.</li>
        <li><strong>Unknown</strong>: domain not in the bundled seed and no LLM pass run yet.</li>
      </ul>

      <h2>The signals</h2>
      <p>Weights below sum to 1.0. Each signal&apos;s contribution to the final score is <code>weight × normalised_value</code>, where normalised_value is in [0, 1] with 1 = more trustworthy.</p>

      <table>
        <thead><tr><th>Signal</th><th>Weight</th><th>What it captures</th></tr></thead>
        <tbody>
          <tr><td>Bundled domain tier</td><td>0.22</td><td>Publisher reputation from MBFC, Wikipedia RSP, and our community feedback.</td></tr>
          <tr><td>AI-content probability</td><td>0.18</td><td>LLM-detected markers: stilted phrasing, superlative density, absence of specific nouns, translation-flavoured English.</td></tr>
          <tr><td>Expertise-to-topic fit</td><td>0.12</td><td>Does the author show subject-matter authority proportional to the claims?</td></tr>
          <tr><td>Editorial bias markers</td><td>0.10</td><td>Partisan framing, unsupported claims, emotional loading, straw-men, cherry-picking.</td></tr>
          <tr><td>Citation density</td><td>0.10</td><td>Outlinks to primary sources, normalised by article length.</td></tr>
          <tr><td>Byline</td><td>0.06</td><td>A named author is harder to fake than an anonymous byline.</td></tr>
          <tr><td>Publication freshness</td><td>0.06</td><td>For news queries, recency matters; for evergreen topics, less so.</td></tr>
          <tr><td>Ad-to-content ratio</td><td>0.06</td><td>Heavy ad saturation correlates with content-farm economics.</td></tr>
          <tr><td>HTTPS validity</td><td>0.04</td><td>A floor signal — most legitimate publishers pass it.</td></tr>
          <tr><td>Domain age</td><td>0.03</td><td>Brand-new domains get more scepticism.</td></tr>
          <tr><td>Language / locale</td><td>0.03</td><td>Consistency between declared locale, language of content, and query context.</td></tr>
        </tbody>
      </table>

      <h2>Where our signals come from</h2>
      <ul>
        <li><strong>Bundled seed</strong>: the domain reputations that ship with the extension and pre-populate our database. Merged from <a href="https://mediabiasfactcheck.com" target="_blank" rel="noreferrer">MediaBiasFactCheck</a> public ratings, the <a href="https://en.wikipedia.org/wiki/Wikipedia:Reliable_sources/Perennial_sources" target="_blank" rel="noreferrer">Wikipedia Reliable Sources Perennial List</a>, and publicly-available spam / SEO-farm corpora.</li>
          <li><strong>LLM classification</strong>: Claude Haiku 4.5 via the Vercel AI Gateway, called with a structured-output Zod schema. Zero data retention; content is not used for training.</li>
        <li><strong>Heuristic signals</strong>: derived deterministically from the page HTML (byline metadata, outlinks, ad slots, published date, language tags) — no model judgement involved.</li>
        <li><strong>Community feedback</strong>: thumbs up / thumbs down on assessments. Aggregated and used to re-weight domains during the monthly refresh.</li>
      </ul>

      <h2>What we deliberately do <em>not</em> measure</h2>
      <ul>
        <li>The truth of any specific claim in the article.</li>
        <li>Individual author reputation (a v3 feature — requires a cross-publication graph we don&apos;t have yet).</li>
        <li>Political bias on a left/right axis. We track <em>markers of unsupported claims and emotional loading</em>, which can come from any political direction.</li>
        <li>Engagement metrics, social shares, or SEO rank — those are proxies for popularity, not trustworthiness.</li>
      </ul>

      <h2>Refresh cadence</h2>
      <p>Domain reputations re-run every 30 days on a daily cron. Individual page assessments are cached for 30 days — if you re-assess a URL within the window, you get the cached result. Disputes can trigger an immediate re-review.</p>

      <h2>Errors, mistakes, and disputes</h2>
      <p>We will be wrong sometimes. The correct response is visibility and speed, not silence. Every rating is disputable from its page. We publish the aggregate dispute resolution rate on the <Link href="/transparency">transparency page</Link>.</p>

      <h2>Change log</h2>
      <p>Weight changes and policy changes will be logged here with the date and a short rationale. Current version: v0.1 (launch).</p>
    </main>
  );
}
