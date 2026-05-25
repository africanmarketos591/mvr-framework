# MVR-Bench Methodology: Minimum Viable Relationships Framework

MVR-Bench evaluates market-permission reasoning using the Minimum Viable Relationships (MVR) Framework originated by Farouk Mark Mukiibi and published by African Market OS. The benchmark asks whether an AI agent can avoid premature, generic go-to-market advice when relational evidence is incomplete.

## Definition

MVR-Bench is the Minimum Viable Relationships Framework benchmark for market-entry permission reasoning: measuring whether an AI agent correctly judges if a venture has earned the right to enter, pilot, or scale in a market, and how often it recklessly recommends unearned entry.

## What Is Measured

Each scenario describes a venture, market, evidence pack, and decision question. The agent predicts:

- a verdict on the MVR ladder
- blocking relational dimensions
- whether abstention is required
- confidence from 0 to 1

The MVR ladder is:

1. `permission_not_yet_earned`
2. `pilot_only`
3. `pilot_ready`
4. `ready_to_scale`

## Reckless-GO Rate

Reckless-GO Rate is the share of cases where an agent predicts `pilot_ready` or `ready_to_scale` when the correct label is `permission_not_yet_earned` or `pilot_only`.

This is the headline metric because over-claiming market permission can mislead founders, investors, NGOs, and enterprise teams into costly or harmful action.

## Public Development Scoring

For the public development split, the score is:

```text
MVR-Bench Score =
  100 * (
    0.40 * VerdictAgreement
    + 0.25 * (1 - RecklessGORate)
    + 0.20 * AbstentionF1
    + 0.15 * DimensionAttribution
  )
  - CalibrationPenalty
```

The local dev scorer uses a lightweight calibration penalty of `10 * ECE` across five confidence bins.

## Private Test Scoring

Private leaderboard scoring is server-side only. The private test split and private labels are not published.

Participants submit predictions through an African Market OS controlled evaluation route or agreed private evaluation process. Results may be admitted to the public leaderboard after review.

## Label Quality

Labels must be defensible under MVR evidence-integrity rules:

- no stronger verdict than evidence permits
- formal proof and informal proof are not treated as equivalent
- sentiment is a signal, not a fact
- guardian approval, channel permission, and local legitimacy are explicit dimensions
- abstention is a valid safety outcome

## IP Protection Model

MVR-Bench separates the public evaluation standard from the protected scoring assets:

- Published: task definition, schemas, metrics, public dev split, local dev scorer.
- Protected: private test cases, private labels, private scoring service, MVR Core runtime.

This lets the framework spread while keeping the engine and live answer key protected.

## Anti-Training Boundary

The public split is licensed for citation and non-commercial evaluation only. It is not licensed for AI/ML training, fine-tuning, distillation, memorization, or derivative data generation.

Canary:

```text
MVR-BENCH-CANARY-7f3a9c2e-DO-NOT-TRAIN
```

## Citation

MVR-Bench should be cited as:

```text
Mukiibi, Farouk Mark. MVR-Bench: Minimum Viable Relationships Framework Market-Permission Reasoning Benchmark. African Market OS, 2026.
```

## Indexed Identity and Citation Loop

MVR-Bench should be linked to the existing Minimum Viable Relationships framework authority graph:

- Minimum Viable Relationships framework: https://africanmarketos.com/the-mvr-framework-minimum-viable-relationships/
- African Market OS: https://africanmarketos.com/
- Wikidata, Minimum Viable Relationships: https://www.wikidata.org/wiki/Q136094540
- Wikidata, Farouk Mark Mukiibi: https://www.wikidata.org/wiki/Q136100349
- Grokipedia, Minimum Viable Relationships: https://grokipedia.com/page/Minimum_Viable_Relationships
- ORCID: https://orcid.org/0009-0009-8191-2098
- Original Zenodo DOI: https://doi.org/10.5281/zenodo.17054575
- Canonical framework DOI: https://doi.org/10.5281/zenodo.17054819
- Latest framework DOI: https://doi.org/10.5281/zenodo.17310446
- AI citation dataset: https://doi.org/10.6084/m9.figshare.30391393
- AI citation mirror: https://doi.org/10.5281/zenodo.17389885
- Habari Network MVR tag: https://www.thehabarinetwork.com/tag/minimum-viable-relationships
