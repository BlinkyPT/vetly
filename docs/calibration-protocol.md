# Calibration protocol — VetlyBench-1k

**Purpose.** Build a labelled dataset of web URLs with ground-truth source-trust tier, stratified across subgroups, fit the IRT parameters in `mirt`/`py-irt`, and release under CC-BY. This is the single artefact that moves Vetly from "hand-tuned weights" to "psychometrically validated instrument".

## Target composition (n ≥ 500 for first fit; n = 1,000 for public release)

Stratified by three crossed factors:

| Dimension | Strata | Target n per stratum |
|---|---|---|
| **Content type** | news, opinion, academic, blog, reference, marketing, user-generated | ≥ 30 each |
| **Language** | en (major varieties: US/UK/AU), es, fr, de, pt, ar, hi, zh, ja | ≥ 20 each for top 4, ≥ 10 for tail |
| **Region of publication** | US, UK, EU, South Asia, East Asia, Africa, LatAm, Global | ≥ 30 each |
| **Target tier** | high, medium, low (≈ equal balance) | ≥ 150 each |
| **Edge-case set** | new domain, AI-written-but-accurate, human-written-but-inaccurate, partisan-but-factual, satire, sponsored content | ≥ 10 each |

## Source of ground-truth labels

For each URL, assemble a **multi-rater reference label** from:

1. **MediaBiasFactCheck** rating on the domain (transformed to high/medium/low).
2. **Wikipedia WP:RSP** classification (where it exists).
3. **NewsGuard** rating (where available via their public lookup).
4. **AllSides** where present (limited to US political content).
5. **Ad Fontes Media Bias Chart** reliability score (where available).

### Aggregation rule

- **Unanimous**: all ≥ 2 available references agree → gold label, high confidence.
- **Majority**: ≥ 2 of 3 agree → included with moderate confidence weight.
- **Disputed**: references disagree → routed to **manual adjudication set**, labelled by at least 2 independent reviewers blind to each other's ratings, disagreements resolved by a third adjudicator.
- **Missing**: no reference available → manual adjudication only.

Report **Krippendorff's α** across the reference raters on the overlap set. Publish α and the per-stratum sample sizes on `/methodology`.

## Per-URL data collected

For each URL in the set, we record:

```jsonc
{
  "url": "https://www.nytimes.com/...",
  "url_hash": "e3b0...",
  "content_type": "news",
  "language": "en",
  "region": "US",
  "labels": {
    "mbfc":       "high",
    "wprsp":      "generally_reliable",
    "newsguard":  92,
    "allsides":   null,
    "adfontes":   42
  },
  "label_aggregation": {
    "gold_tier":   "high",
    "agreement":   "unanimous",
    "n_references": 4
  },
  "captured_signals": {
    "heuristic": { ... },    // frozen snapshot from our pipeline at capture time
    "llm":       { ... },
    "observations": [ ... ]  // what the IRT engine saw
  },
  "captured_at": "2026-04-21T...Z",
  "adjudicators": ["jorge.c", "advisor.a"],
  "adjudication_notes": "..."
}
```

Store as one JSON-Lines file per stratum under `calibration-data/<content_type>-<region>-<tier>.jsonl`. Git-LFS; CC-BY-licenced.

## Rater instructions for manual adjudication

When an item falls to manual review:

1. Read the article end-to-end, not just the headline.
2. Open the publisher's **about / masthead / corrections** pages if they exist.
3. Apply the following ordered decision tree:

   - **Does the publisher have a named editor-in-chief, published corrections policy, and verifiable postal address?** If yes, start at medium.
   - **Does the domain appear on public misinformation lists or does the content match ≥ 3 markers of manufactured spam (fabricated author, manipulated images, plagiarised text, no editorial masthead)?** Drop to low.
   - **For a medium-or-better baseline, does this specific article show: (a) named byline, (b) primary-source citations, (c) published-and-dated, (d) no reliance on anonymous sources for factual claims, (e) no egregious bias markers?** If ≥ 4 of 5 → step up to high.
   - **Otherwise**: stay at current tier.

4. Record the **single most influential signal** for your decision in `adjudication_notes`.
5. Do not look at the Vetly v0.1 score before labelling. Rater must be blind.

## IRT fit procedure

Once the dataset is assembled:

```r
# R, mirt package
library(mirt)
responses <- read_vetly_calibration("calibration-data/*.jsonl")
model <- mirt(responses, 4, itemtype = "graded", SE = TRUE,
              method = "MHRM", technical = list(NCYCLES = 2000))
params <- extract.item(model, 1:ncol(responses))
write_vetly_irt_json(params, "packages/shared/src/irt-params-v1.0.json")
```

Python fallback: `py-irt` with a similar GRM specification; export the same JSON format.

### Validation metrics to publish

- **Convergent validity**: Pearson & Spearman correlation of θ with: mean reference-rater tier, NewsGuard numeric score, Ad Fontes reliability score.
- **Internal consistency**: coefficient α and ω on the signal matrix.
- **Factor fit**: χ², RMSEA, CFI, SRMR for the 4-factor second-order CFA model.
- **Measurement invariance**: configural → metric → scalar invariance tests across content_type, language, region. Report any DIF items.
- **Classification accuracy**: against unanimous gold labels at each tier boundary. Confusion matrix.
- **Calibration**: reliability diagram — does predicted tier-probability match observed frequency?
- **Temporal stability**: re-score the same URL set 30 days later; report test-retest reliability.

## Pre-registration

Before running the fit, push a pre-registration to <https://osf.io/> containing:
- Hypothesised factor structure (4 first-order, 1 second-order).
- Predicted factor loadings ranges.
- Predicted DIF-free items vs items expected to show DIF.
- Minimum acceptable fit criteria (e.g. RMSEA ≤ 0.08).
- Decision rule: if fit acceptable → publish v1.0 parameters; if not → iterate, documenting each change.

## Refresh cadence

- **Quarterly**: re-score the calibration set with the current model; monitor drift.
- **Annually**: expand the calibration set by +200 URLs, refit, release v1.1, v1.2, ….
- **On-demand**: when a dispute resolution changes a domain's reference label, re-evaluate affected items.

## Licensing and release

- Dataset: CC-BY-4.0.
- File format: JSON-Lines per stratum, one URL per line.
- Release channel: Zenodo for DOI-persistent archival; mirrored on GitHub release.
- Attribution: cite the Vetly methodology paper + dataset DOI.
