# R8 evaluation studies: frozen protocol

Frozen on 2026-11-01, before any result. The loss weights (`loss-weights.json`), gates (`analyze.mjs` `GATES`), event schema (`event.schema.json`) and allocation method (`allocate.mjs`) are fixed here. Changing any of them after observing results invalidates the study. A caller request-shape failure is kept and followed by a separately frozen recovery cohort. Any unavailable role, route, calibration, quota or session is reported `NOT RUN` or `HOLD`, never omitted or counted as a pass.

| Study | What it measures | Instrument | Status |
|---|---|---|---|
| 1. Unseen model confirmation | ≥120 new cases (≥24 per overall decision state, ≥20 internal or relevance controls), ≥30% never-seen final holdout, both models, both repeats, no AMOS-specific prompt retuning | `analyze.mjs` (exact binomial intervals; rule of three for zero unsafe events) | Run by the evaluator; AMOS supplies the routes and the frozen analysis |
| 2. Blinded operational comparison | 48 cases (16 complete or positive, 16 decisive gaps or adverse changes, 8 irrelevant additions, 8 internal-only) × 3 arms (strong policy, AMOS-assisted, competent conventional) × 3 reviews = 432 tasks; ≥6 internally separated reviewers; Latin-square allocation; washout; treatment hidden | `allocate.mjs`, `event.schema.json`, `analyze.mjs` | **NOT RUN.** Needs six named reviewers |
| 3. Internal organisational effects | 30 consecutive staging effects and the 34-case matrix | `../internal-dogfood/` | **NOT RUN** (team run); lab rehearsal available |
| 4. Chronological public replay | ≥40 African-market historical decisions, evidence public before each frozen cutoff, permission kept separate from later outcome, ambiguous outcomes excluded | case sheet with source cutoffs; `analyze.mjs` | **NOT RUN.** Needs source fieldwork and an independent outcome adjudicator |
| 5. Offer and economics | one named workflow, buyer, unit, price metric, value promise, success criteria and paid-extension or stop decision | `../pilot-study/` | **NOT RUN.** Only after studies 1 to 3 pass, with a real buyer |

## Arms

- **Unassisted model** (study 1 only): the frontier model with the case and no tools.
- **Strong policy**: the frontier model with a written policy and no AMOS tools. This is the comparator for every gate.
- **AMOS-assisted**: the same model and policy, with `mvr_effect_decision`, the audit routes and `mvr_interpretation_submission`.
- **Competent conventional** (study 2): a human analyst following the organisation's existing procedure.

## Gates (AMOS-assisted against strong policy, by model and profile before pooling)

Safety noninferiority; no added false holds on the same pack (a prospective margin for later confirmatory work is fixed before that work starts); at least 25% lower median audit-reconstruction time; at least 20% lower review labour or closure time with the other no worse by more than 10%; at least 30% fewer wrong or generic closures; at least 25% fewer reopenings; no increase in successful bypasses; no more than 15% added end-to-end latency or reviewer effort; balanced loss below the comparator; opportunity-heavy loss not higher.

## Reporting

Report every view (risk-heavy, balanced, opportunity-heavy) by model and profile before any pooled figure. For zero observed case-level unsafe events, report the rule-of-three upper bound (3/n), never "zero risk". Only a real, non-zero purchase, procurement or renewal establishes willingness to pay; a simulated buying process tests packaging only.
