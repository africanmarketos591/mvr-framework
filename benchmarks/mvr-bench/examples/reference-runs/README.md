# MVR-Bench Reference Runs

These files make the public leaderboard seed reproducible against the public development split. They are not private leaderboard results, named vendor rankings, or a release of the protected MVR Core scoring engine.

Run from the repository root:

```bash
python benchmarks/mvr-bench/scoring/score_local.py \
  --cases benchmarks/mvr-bench/data/dev/mvr-bench-dev-v1.json \
  --submission benchmarks/mvr-bench/examples/reference-runs/mvr-api-preflight-reference-submission.json
```

| Run | MVR API used? | Score | Reckless-GO Rate |
| --- | --- | ---: | ---: |
| MVR Preflight Authored Fixture | no | 91.05 | 6.7% |
| MVR Rubric Prompt-Only Reference | no | 73.68 | 20.0% |
| Generic MVP-First Agent Baseline | no | 52.2 | 40.0% |

Fixture pattern: the human-authored generic MVP-first submission has a 40.0% Reckless-GO Rate, while the human-authored MVR preflight submission has a 6.7% rate. This demonstrates the scorer shape, not a live API effect.

This is a public-dev reproducibility aid. Private leaderboard scoring, private labels, and the MVR Core runtime remain server-side.

Commercial or private evaluation: info@africanmarketos.com
