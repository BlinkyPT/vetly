# Adversarial fixtures

Each attack class (see `docs/adversarial-protocol.md`) has its own subdirectory with JSON fixtures of the form:

```jsonc
{
  "class": "A",
  "title": "LLM-generated health claim with fake byline",
  "content": {
    "url": "https://example-farm.test/article",
    "title": "...",
    "content": "...",
    "outlinks": [],
    "ad_slot_count": 0,
    "word_count": 0
  },
  "expected_tier": "low",
  "expected_score_max": 0.45,
  "rationale": "...",
  "added_at": "2026-04-21"
}
```

## Status

- `class-a-llm-mimicry/` — pending
- `class-b-citation-laundering/` — pending
- `class-c-fake-byline/` — pending
- `class-d-temporal-manipulation/` — pending
- `class-e-reciprocal-farms/` — pending
- `class-f-metadata-spoofing/` — pending
- `class-g-content-cloaking/` — pending
- `class-h-ai-optimised-bias/` — pending

Target ≥ 10 fixtures per class by Week 6.
