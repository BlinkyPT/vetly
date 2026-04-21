import Link from "next/link";

export const metadata = { title: "Vetly methodology — how we score source trust" };

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-slate dark:prose-invert">
      <div className="not-prose rounded-lg border border-vetly-amber/40 bg-vetly-amber/5 p-4 text-sm">
        <strong className="text-vetly-amber">Algorithm v0.1 — calibration in progress.</strong>
        <p className="mt-1 mb-0 text-slate-700 dark:text-slate-300">
          Current IRT parameters are hand-derived priors, not fitted. A labelled calibration set (n ≥ 300, stratified across publication type × language × region) is being assembled; v1.0 parameters will be refit on that set and swapped in with no code change. Accuracy / reliability / invariance statistics will appear on this page as soon as calibration completes. This banner will update.
        </p>
      </div>

      <h1>Methodology</h1>
      <p>
        Vetly scores <strong>sources</strong>, not <strong>specific claims</strong>. Rating &quot;is the Daily Mail broadly a low-trust publisher?&quot; is observable and defensible. Rating &quot;is this specific sentence in this specific article true?&quot; is a harder, more legally-exposed, more easily-gamed problem. We leave per-claim fact-checking to Snopes, PolitiFact, and Full Fact. Source-trust is our lane.
      </p>

      <h2>Signal, not gate</h2>
      <p>
        Vetly never hides or re-orders results. It only annotates. Editorial judgement is kept with the reader. If you disagree with a rating, this page tells you exactly what went into it; every assessment is <Link href="/disputes">disputable</Link>.
      </p>

      <h2>The construct</h2>
      <p>
        &quot;Source trust&quot; is operationalised as a second-order latent construct with four first-order facets:
      </p>
      <ul>
        <li><strong>Factual rigour</strong> — citation density, citation-graph tier (forthcoming), specific claim density.</li>
        <li><strong>Editorial integrity</strong> — named byline, bias markers, AI-generated-content probability, ad-to-content ratio.</li>
        <li><strong>Temporal currency</strong> — publication freshness, locale consistency, temporal integrity (forthcoming).</li>
        <li><strong>Authority alignment</strong> — publisher reputation (bundled seed + community), expertise-to-topic fit, domain age, HTTPS validity.</li>
      </ul>
      <p>
        A page receives four facet sub-scores plus an overall score. Users can weight facets themselves for their context — a medical claim warrants up-weighting factual rigour; a restaurant review warrants weighting byline and currency.
      </p>

      <h2>The scoring model</h2>
      <p>
        We use a <strong>2-parameter logistic IRT model</strong> over the signals. Each signal i has a discrimination parameter a<sub>i</sub> (how steeply it distinguishes trust levels) and a difficulty b<sub>i</sub> (the latent-trust level at which its expected response crosses 0.5). Latent trust θ for a given page is estimated by maximum likelihood; we report θ and its standard error, then map θ to a 0–100 score via the standard-normal CDF. This replaces the classical weighted-sum approach of v0 — which worked but could not report calibrated uncertainty, handle missing data gracefully, or be refit on external criteria.
      </p>
      <p>
        Tier thresholds are chosen to match an external reference distribution (planned calibration against MBFC + WP:RSP + NewsGuard majority-agreement labels). Tier assignment uses θ minus one standard error: when the lower bound crosses a tier boundary, we return &quot;mixed&quot; rather than force a classification.
      </p>

      <h2>Current item parameters (v0.1, hand-derived priors)</h2>
      <table>
        <thead><tr><th>Signal</th><th>Facet</th><th>a (discrim.)</th><th>b (diff.)</th></tr></thead>
        <tbody>
          <tr><td>Publisher tier (bundled)</td><td>Authority</td><td>2.4</td><td>-0.2</td></tr>
          <tr><td>AI-content probability</td><td>Editorial</td><td>2.0</td><td>0.0</td></tr>
          <tr><td>Expertise-to-topic fit</td><td>Authority</td><td>1.6</td><td>0.0</td></tr>
          <tr><td>Bias markers</td><td>Editorial</td><td>1.4</td><td>0.0</td></tr>
          <tr><td>Citation density</td><td>Factual</td><td>1.3</td><td>0.0</td></tr>
          <tr><td>HTTPS validity</td><td>Authority</td><td>1.2</td><td>-1.4</td></tr>
          <tr><td>Named byline</td><td>Editorial</td><td>1.0</td><td>-0.2</td></tr>
          <tr><td>Ad-to-content ratio</td><td>Editorial</td><td>0.9</td><td>0.0</td></tr>
          <tr><td>Publication freshness</td><td>Temporal</td><td>0.8</td><td>0.0</td></tr>
          <tr><td>Domain age</td><td>Authority</td><td>0.7</td><td>0.0</td></tr>
          <tr><td>Language consistency</td><td>Temporal</td><td>0.6</td><td>0.0</td></tr>
        </tbody>
      </table>

      <h2>Counterfactual explanations</h2>
      <p>
        Every assessment includes up to three counterfactual paths (Wachter, Mittelstadt &amp; Russell, 2018) — <em>&quot;if the publisher changed X, the score would move by ∆&quot;</em>. This gives publishers a direct, actionable signal for how to improve rather than a bare number they can only argue with.
      </p>

      <h2>Where our signals come from</h2>
      <ul>
        <li><strong>Bundled seed</strong> — ~100k-domain seed merging <a href="https://mediabiasfactcheck.com" target="_blank" rel="noreferrer">MediaBiasFactCheck</a>, the <a href="https://en.wikipedia.org/wiki/Wikipedia:Reliable_sources/Perennial_sources" target="_blank" rel="noreferrer">Wikipedia Reliable Sources</a> perennial list, and public spam / SEO-farm corpora.</li>
        <li><strong>LLM classification</strong> — Claude Haiku 4.5 via the Vercel AI Gateway, tool-use structured output. Temperature 0.2 for v0.1; will drop to 0 with few-shot anchors once calibration examples exist.</li>
        <li><strong>Heuristic signals</strong> — pure deterministic extraction from page HTML: byline metadata, outlinks, ad slots, published date, language tags.</li>
        <li><strong>Community feedback</strong> — thumbs up / down, weighted by rater track record, aggregated monthly.</li>
      </ul>

      <h2>What we deliberately do <em>not</em> measure</h2>
      <ul>
        <li>The truth of any specific claim in an article.</li>
        <li>Popularity, engagement, or SEO rank.</li>
        <li>Political bias on a left/right axis — we track markers of unsupported claims and emotional loading, which are orthogonal to political direction.</li>
        <li>Individual author reputation beyond byline presence (v3 feature).</li>
      </ul>

      <h2>The six-week roadmap to v1.0</h2>
      <ol>
        <li><strong>Week 1 — calibration scaffolding</strong>. IRT engine, facet sub-scores, counterfactuals, v0.1 priors, honest methodology page. <em>← you are here.</em></li>
        <li><strong>Week 2 — calibration set + IRT fitting</strong>. 500 URLs hand-labelled against MBFC + WP:RSP + NewsGuard unanimous agreement. Fit item parameters and tier thresholds in <code>mirt</code>. Report convergent validity (Pearson / Spearman with reference raters).</li>
        <li><strong>Week 3 — measurement invariance</strong>. Multi-group CFA across publisher type × language × region. Any DIF findings → per-subgroup branches or broader item definitions.</li>
        <li><strong>Week 4 — citation-graph propagation</strong>. PageRank-style trust propagation over the outlink graph. Nightly batch. Rich-new-domain cold-start solved.</li>
        <li><strong>Week 5 — temporal integrity</strong>. Archive.org diff signals. Silent-edit detection. Certificate and DNS history.</li>
        <li><strong>Week 6 — adversarial suite + public benchmark</strong>. Attack-class fixtures (LLM-generated spam, citation laundering, byline faking, temporal manipulation). VetlyBench-1k released under CC-BY.</li>
      </ol>

      <h2>Errors, mistakes, and disputes</h2>
      <p>We will be wrong sometimes. The correct response is visibility and speed, not silence. Every rating is <Link href="/disputes">disputable</Link> from its page, and resolutions are published. Aggregate dispute statistics appear on the <Link href="/transparency">transparency page</Link>.</p>

      <h2>Open source + reproducibility</h2>
      <p>
        The full codebase is on <a href="https://github.com/BlinkyPT/vetly" target="_blank" rel="noreferrer">GitHub</a>. IRT parameters ship as a versioned JSON file at <code>packages/shared/src/irt-params-v0.1.json</code>. The calibration set will be released under CC-BY when complete. Every algorithm change will be pre-registered on OSF before it lands, with the hypothesis, predicted effect, and decision rule. Our methodology is not just transparent — it&apos;s reproducible.
      </p>

      <h2>References</h2>
      <ul>
        <li>Messick, S. (1995). Validity of psychological assessment. <em>American Psychologist, 50</em>(9).</li>
        <li>Samejima, F. (1969). Estimation of latent ability using a response pattern of graded scores. <em>Psychometrika Monograph 17</em>.</li>
        <li>Wachter, S., Mittelstadt, B., &amp; Russell, C. (2018). Counterfactual explanations without opening the black box. <em>Harvard JLT</em>.</li>
        <li>Mitchell, M. et al. (2019). Model Cards for Model Reporting. <em>FAT*</em>.</li>
        <li>Gebru, T. et al. (2018). Datasheets for Datasets. <em>ACM</em>.</li>
      </ul>
    </main>
  );
}
