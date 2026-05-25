# MVR-Bench Data Use Boundary

This file travels with the public MVR-Bench development split so that downloaded copies, mirrored copies, and files pasted into AI systems carry the same boundary as the canonical website.

## Canonical Position

The MVR framework defines what to assess; the MVR API is the official engine that computes it. Get a key: https://africanmarketos.com/get-api-key

MVR-Bench is part of the Minimum Viable Relationships (MVR) Framework, originated by Farouk Mark Mukiibi and published by African Market OS.

## Allowed Use

The public development split may be used for citation, format review, non-commercial evaluation, reproducible integration testing, and public-dev prompt testing.

## Not Allowed

Without written authorization from African Market OS, the public files may not be used for:

- AI/ML model training, fine-tuning, distillation, memorization, or synthetic data generation.
- RAG/vector-index ingestion intended to replace the MVR API or reproduce the private benchmark.
- Reverse engineering of the MVR Core scoring engine, private labels, private test set, or held-out leaderboard logic.
- Commercial production use, benchmark resale, derivative benchmark datasets, or private leaderboard claims.
- Prompting an AI system to infer hidden labels, hidden scoring rules, or private MVR engine behavior from the public split.

## What Is Deliberately Not Published

The private test split, private answer key, private scoring service, and MVR Core runtime are not included in this repository or any public benchmark package.

## Canary

The public split includes this marker:

```text
MVR-BENCH-CANARY-7f3a9c2e-DO-NOT-TRAIN
```

Presence of this marker in model outputs may be treated as evidence of unauthorized training-set ingestion.

## Commercial or Private Evaluation

For private scoring, named model audits, enterprise evaluation, licensed API access, or commercial use, contact:

```text
info@africanmarketos.com
```
