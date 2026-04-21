# VetlyBench

Open benchmark for source-trust prediction. Target: become the reference evaluation set for the field, the way ImageNet did for computer vision or GLUE did for NLP.

## Planned artefacts (v1.0)

- **VetlyBench-1k**: 1,000 URLs, multi-rater ground-truth tier labels, stratified across content type × language × region. CC-BY-4.0.
- **VetlyBench-Adv**: ≥ 80 adversarial fixtures across 8 attack classes (see `docs/adversarial-protocol.md`). CC-BY-4.0.
- **Leaderboard**: public, any system can submit predictions and get scored on overall accuracy, subgroup accuracy, calibration, adversarial robustness, and temporal stability.

## Evaluation metrics

- **Overall accuracy** on unanimous gold labels.
- **Subgroup accuracy** on content type × language × region cells with n ≥ 20.
- **Calibration error** (expected-calibration-error; reliability diagram).
- **Adversarial robustness** (mean pass rate across attack classes).
- **Temporal stability** (test-retest correlation at 30 days).
- **Inter-rater agreement with human experts** (Krippendorff's α on a 100-URL held-out set).

## Submission format

```jsonc
{
  "system_name": "your-system-v1",
  "predictions": [
    { "url_hash": "e3b0...", "predicted_tier": "high", "predicted_score": 0.82, "confidence": 0.91 },
    ...
  ]
}
```

Submit via pull request against the public leaderboard repository (forthcoming). Scored automatically; results published within 24 hours.

## Status

- [ ] Calibration set assembled (target Week 2).
- [ ] IRT parameters fit (Week 2).
- [ ] Measurement-invariance analysis (Week 3).
- [ ] Citation-graph propagation (Week 4).
- [ ] Temporal integrity (Week 5).
- [ ] Adversarial suite (Week 6).
- [ ] Public release + DOI.

Track progress on the Vetly GitHub issues board.
