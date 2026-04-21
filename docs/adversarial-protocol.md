# Adversarial robustness protocol

Vetly is deployed against actors who will actively try to game it. This document specifies the **attack taxonomy**, the **regression suite**, and the **release-blocking criteria**.

## Threat model

Attackers in scope:

1. **SEO / content farms** — publishers optimising for engagement, not truth. Technical sophistication: moderate.
2. **AI-content factories** — LLM-generated output at scale, often with plausible-sounding metadata. Sophistication: low-to-high depending on actor.
3. **State / political propaganda networks** — coordinated multi-site campaigns, linguistically sophisticated, well-resourced.
4. **Single-issue bad actors** — health misinformation, financial scam sites, specific disinformation operations.
5. **Sophisticated academic / red-team** — will read our open-source code and try to craft edge cases.

Out of scope (for v1):

- Platform-level collusion (e.g. an entire CMS platform systematically inflating trust signals).
- Physical-world identity fraud (fake real-person bylines with stolen identities).

## Attack taxonomy — the suite

For each attack class we maintain at least 10 adversarial fixtures under `benchmark/adversarial/<class>/`. Each fixture is a self-contained JSON file with the page content + expected classification.

### A. LLM-generated trust-mimicry

- Prose engineered to mimic high-trust patterns (specific nouns, dated references, named-author-flavoured writing).
- Generated at various temperatures (0.2, 0.7, 1.0) and via different base models.
- Expected: Vetly's `ai_probability` signal should cross 0.6+; overall score should stay ≤ medium.

### B. Citation laundering

- Spam-farm article citing 3–5 genuinely high-trust sources (e.g. NYT, Reuters, NEJM), then making unsupported claims.
- Expected: citation-count signal is high but citation-graph-tier propagation + bias markers keep overall ≤ medium.

### C. Fake byline / authority theft

- Article with a claimed author who does not exist elsewhere, or a real name used without permission.
- Expected: byline-verification signal (v2) catches this; score stays ≤ medium.

### D. Temporal manipulation

- Backdated article to appear old (pre-LLM era) when it was actually generated recently.
- Stealth-edited article where factual claims were added post-publication.
- Expected: temporal-integrity signal (v2) catches this; score degrades.

### E. Reciprocal link farms

- Set of 20+ low-trust domains citing each other densely, giving each other artificial citation inflow.
- Expected: citation-graph propagation (v2) identifies tight reciprocal clusters and discounts them.

### F. DOM / metadata spoofing

- Article with fake `meta[property='article:published_time']`, fake `<meta name="author">`, fake JSON-LD schema.
- Expected: byline/freshness signals alone can be fooled; overall score still drops via other signals.

### G. Content cloaking

- Page serves different content to our `safeFetch` User-Agent vs a real browser.
- Expected: use-agent-matched fetching + spot-checks catch this (v2).

### H. AI-optimised bias

- Content engineered to pass our bias-marker LLM classifier while being substantively biased (subtle framing, selective citation).
- Expected: expert-review override in disputes; adversarial fixture documents the failure mode so the next model revision can address it.

## Regression suite

- Runs on every PR via CI.
- Each attack class has a **baseline success rate** measured when the class is added. New changes must not regress any class by more than 2 percentage points without explicit sign-off.
- Pass/fail: the fixture's output tier matches the expected tier (or is stricter).
- Adversarial-robustness (AR) scalar published on `/methodology`: `AR = mean pass-rate across all attack classes`.

## Bounty

Once live: $50 (from the donation pool) paid via Stripe Invoice to anyone who submits a reproducible adversarial example that:
1. Currently fools Vetly (scores ≥ medium when gold label is low).
2. Passes the adjudication review by at least one non-submitter reviewer.
3. Is added to the regression suite as a new fixture.

Submission via a GitHub issue with the attack class tag.

## Adversarial refresh

- **Quarterly**: generate a new cohort of fixtures for classes A, F, H (the ones most affected by model drift).
- **When LLM family upgrades**: re-run class A with the new model; expected success rate may drop.
- **Post-incident**: if a dispute resolution reveals an attack-class we missed, add a fixture and a regression for it.

## Documentation

Every adversarial fixture must include:

```jsonc
{
  "class": "A",
  "title": "Short descriptive name",
  "content": { /* fake page HTML + extracted fields */ },
  "expected_tier": "low",
  "expected_score_max": 0.45,
  "rationale": "Why this attack should be caught; which signal is the primary defence.",
  "added_at": "2026-04-21",
  "submitter": "jorge.c",
  "references": [ /* link to related research or real-world examples */ ]
}
```
