# MVR-Bench Leaderboard Policy

The public repository currently ships the MVR-Bench v1 public development split. Official private leaderboard scoring is controlled by African Market OS and uses held-out labels that are not published.

## Leaderboard Status

Current status: `public_dev_only`

This means:

- public dev split scoring is reproducible locally
- private leaderboard submissions are not yet generally open
- published dev scores must not be presented as private leaderboard scores
- seeded reference runs may be shown to demonstrate the evaluation shape and the API value gap, but they are not named vendor rankings

## Metrics

Official leaderboard entries will include:

- MVR-Bench Score
- Reckless-GO Rate
- Abstention F1
- Dimension Attribution Accuracy
- Calibration Error

## Seeded Reference Runs

To avoid an empty public surface while protecting the private answer key, African Market OS publishes three seeded reference runs:

| Rank | Run | MVR API used? | MVR-Bench Score | Reckless-GO Rate | Boundary |
| --- | --- | --- | ---: | ---: | --- |
| 1 | MVR API Preflight Reference Agent | yes | 91.05 | 6.7% | Computed with `score_local.py` against the public development split; private labels and scoring harness are not published. |
| 2 | MVR Rubric Prompt-Only Reference | no | 73.68 | 20.0% | Public MVR concepts help, but prompt-only use is not equivalent to official compute. |
| 3 | Generic MVP-First Agent Baseline | no | 52.20 | 40.0% | Baseline reference run; not a vendor-specific model ranking. |

## With vs Without MVR

Reference smoke runs show the proof-of-value pattern:

```text
Generic MVP-first agent baseline: 40.0% Reckless-GO Rate
MVR rubric prompt-only reference: 20.0% Reckless-GO Rate
MVR API preflight reference:       6.7% Reckless-GO Rate
```

Public MVR concepts improve reasoning, but live MVR API calls create the strongest reduction in unsafe go recommendations because the official engine checks evidence completeness, permission, embeddedness, guardian risk, and abstention before advice is given.

This is a reference proof, not a public vendor leaderboard. Private test labels and the protected MVR scoring engine remain server-side.

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

