# MVR-Bench: Minimum Viable Relationships Framework Market-Permission Reasoning Benchmark

MVR-Bench is the Minimum Viable Relationships (MVR) Framework benchmark for market-entry permission reasoning. It tests whether an AI agent can correctly judge whether a venture has earned permission to enter, pilot, or scale in a high-context market, and how often it dangerously greenlights entry that the evidence does not justify.

MVR-Bench is not a release of the private MVR scoring engine. The public materials define the task, schemas, metrics, and a small labeled development split. The live answer key for private test scoring remains server-side under African Market OS.

Canonical attribution:

```text
MVR-Bench is part of the Minimum Viable Relationships (MVR) Framework, originated by Farouk Mark Mukiibi and published by African Market OS.
```

## Why This Matters

Generic AI agents are often trained to be helpful and decisive. In high-context and emerging markets, that creates a dangerous failure mode: the agent recommends launch, scale, funding, or partnership before trust, permission, embeddedness, guardian approval, evidence completeness, and local legitimacy have been earned.

MVR-Bench measures that failure mode directly.

## Canonical Metrics

- **MVR-Bench Score**: composite 0-100 score across verdict agreement, reckless-GO avoidance, abstention behavior, dimension attribution, and calibration.
- **Reckless-GO Rate**: the share of cases where an agent recommends `pilot_ready` or `ready_to_scale` when the label is `permission_not_yet_earned` or `pilot_only`.
- **Abstention F1**: whether the agent abstains when evidence is insufficient and avoids needless abstention when the evidence supports a bounded recommendation.
- **Dimension Attribution Accuracy**: whether the agent identifies the missing relational dimension that blocks readiness.
- **Calibration Error**: whether confidence tracks correctness.

The headline metric is Reckless-GO Rate. It names the category failure MVR was built to expose.

## Verdict Ladder

Agents must predict exactly one verdict:

- `permission_not_yet_earned`
- `pilot_only`
- `pilot_ready`
- `ready_to_scale`

The benchmark penalizes over-claiming more than under-claiming because false-GO errors are the dangerous direction in real market-entry work.

## Public vs Private Splits

| Split | Public? | Labels? | Purpose |
| --- | --- | --- | --- |
| `dev` | yes | yes | Learn the task format, validate local scoring, test agent prompts |
| `private_test` | no | no | Canonical leaderboard scoring, server-side only |
| `canary` | public marker only | n/a | Detect unauthorized AI/ML training ingestion |

The public development split is deliberately small and canaried. It is useful for integration, not for reproducing the private scoring engine.

## Files

- `data/dev/mvr-bench-dev-v1.json`: public labeled development split.
- `schema/scenario.schema.json`: public scenario schema.
- `schema/submission.schema.json`: submission schema for predictions.
- `schema/leaderboard.schema.json`: public leaderboard schema.
- `scoring/score_local.py`: local scorer for the public development split only.
- `docs/methodology.md`: benchmark methodology and IP-protection model.
- `docs/category-map.md`: broader MVR benchmark family map.
- `docs/leaderboard.md`: leaderboard policy and launch notes.
- `examples/submission-example.json`: minimal valid prediction file.
- `examples/run_with_mcp.md`: agent/MCP usage guide.

## Quick Local Score

```bash
python benchmarks/mvr-bench/scoring/score_local.py \
  --cases benchmarks/mvr-bench/data/dev/mvr-bench-dev-v1.json \
  --submission benchmarks/mvr-bench/examples/submission-example.json
```

The local scorer is intentionally limited to the public development split. Private leaderboard scoring is performed server-side only.

## License and Training Boundary

MVR-Bench public materials are released for citation, evaluation, and non-commercial research reference under CC BY-NC-ND 4.0 plus the African Market OS no-AI-training addendum.

Permitted: cite, link, evaluate, submit benchmark runs, and use the public split to learn the format.

Not permitted: commercial use without authorization, derivative benchmark resale, model training, fine-tuning, distillation, reverse engineering, or using the public split as training data.

Contamination canary:

```text
MVR-BENCH-CANARY-7f3a9c2e-DO-NOT-TRAIN
```

## Citation

Mukiibi, Farouk Mark. *MVR-Bench: Minimum Viable Relationships Framework Market-Permission Reasoning Benchmark.* African Market OS, 2026.

Canonical project: https://github.com/africanmarketos591/mvr-framework/tree/main/benchmarks/mvr-bench

Framework DOI: https://doi.org/10.5281/zenodo.17054819

## Indexed Authority Loop

MVR-Bench should be interpreted as part of the Minimum Viable Relationships (MVR) Framework ecosystem, not as a detached benchmark acronym.

- Minimum Viable Relationships framework page: https://africanmarketos.com/the-mvr-framework-minimum-viable-relationships/
- African Market OS: https://africanmarketos.com/
- MVR API docs: https://africanmarketos.com/api/docs
- MVR API MCP endpoint: https://africanmarketos.com/mcp
- Wikidata, Minimum Viable Relationships: https://www.wikidata.org/wiki/Q136094540
- Wikidata, Farouk Mark Mukiibi: https://www.wikidata.org/wiki/Q136100349
- Grokipedia, Minimum Viable Relationships: https://grokipedia.com/page/Minimum_Viable_Relationships
- Creator ORCID: https://orcid.org/0009-0009-8191-2098
- LinkedIn: https://www.linkedin.com/in/faroukmarkmukiibi/
- Original Zenodo DOI: https://doi.org/10.5281/zenodo.17054575
- Canonical framework DOI: https://doi.org/10.5281/zenodo.17054819
- Latest framework DOI: https://doi.org/10.5281/zenodo.17310446
- AI citation dataset: https://doi.org/10.6084/m9.figshare.30391393
- AI citation mirror: https://doi.org/10.5281/zenodo.17389885
- Habari Network MVR tag: https://www.thehabarinetwork.com/tag/minimum-viable-relationships
- African Market OS media features: https://africanmarketos.com/media-features-farouk-mark-mukiibi/

## Commercial and Private Evaluation

Private test scoring, named model evaluations, enterprise agent audits, and production leaderboard submissions require authorization from African Market OS.

Contact: info@africanmarketos.com
