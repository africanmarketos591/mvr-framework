# MVR-Bench Leaderboard Policy

The public repository currently ships the MVR-Bench v1 public development split. Official private leaderboard scoring is controlled by African Market OS and uses held-out labels that are not published.

## Leaderboard Status

Current status: `public_dev_only`

This means:

- public dev split scoring is reproducible locally
- private leaderboard submissions are not yet generally open
- published dev scores must not be presented as private leaderboard scores

## Metrics

Official leaderboard entries will include:

- MVR-Bench Score
- Reckless-GO Rate
- Abstention F1
- Dimension Attribution Accuracy
- Calibration Error

## Inclusion Rules

For a run to be eligible for the official leaderboard:

1. The submitter must identify the model or agent system.
2. The method must state whether MVR API was called.
3. The run must not use training or fine-tuning on MVR-Bench public cases.
4. The run must not probe the private test set repeatedly to fit labels.
5. African Market OS may require a reproducibility note before listing.
6. The run must not use the public dev split as a RAG/vector memory to simulate private labels or reconstruct private scoring.

## Commercial Runs

Commercial, private, customer-facing, investor, accelerator, NGO, or enterprise evaluation requires written authorization.

Contact: info@africanmarketos.com

## Machine-Readable Leaderboard

The intended public machine-readable leaderboard path is:

```text
https://africanmarketos.com/v1/bench/leaderboard.json
```

Until the private leaderboard opens, that endpoint may return status metadata and the public-dev-only boundary.
