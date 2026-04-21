export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 prose prose-slate dark:prose-invert">
      <h1>Vetly privacy policy</h1>
      <p><em>Last updated: 2026-04-21</em></p>

      <h2>What Vetly reads</h2>
      <p>When you visit a Google search results page, the Vetly extension reads the list of result URLs so it can look up their domains in a bundled reputation list and render a badge next to each.</p>
      <p>When you click a search result and Vetly detects a supported content page, the extension extracts the main article text (using the Readability algorithm in your browser) and sends it to our API so we can score it. This happens only for <strong>deep assessments</strong>, which are opt-in and rate-limited.</p>

      <h2>What we send to our server</h2>
      <ul>
        <li>The URL you are reading</li>
        <li>The extracted main content (not the full page HTML)</li>
        <li>Basic page metadata we detected: title, author, publication date, number of outlinks, number of ad slots, word count</li>
        <li>A device-bound UUID (not tied to your identity) so we can enforce free-tier limits</li>
      </ul>
      <p>We do <strong>not</strong> send: your cookies, your session, your history, your search queries, your IP (beyond what every web request includes), or any form inputs.</p>

      <h2>What our server stores</h2>
      <ul>
        <li>A hash of the URL, the score, and the signals — shared across users so we do not re-score the same article twice.</li>
        <li>Your thumbs up / thumbs down feedback, if you submit it.</li>
        <li>Your daily deep-assessment count for quota enforcement.</li>
      </ul>

      <h2>AI processing</h2>
      <p>Content you submit for deep assessment is passed to Claude Haiku 4.5 via the Vercel AI Gateway. The gateway operates with zero data retention — the content is not used for training and is not retained beyond the single request.</p>

      <h2>You can delete your data</h2>
      <p>Sign in and email <a href="mailto:privacy@vetly.app">privacy@vetly.app</a>, or use Supabase Auth&apos;s built-in delete flow from Settings. Shared page-assessment cache entries are anonymous and not linked to you.</p>
    </main>
  );
}
