# R14 dependency and audit sets

These seven sets were written on 18 November 2026 from the independent evaluator's R14 letter and the public contract. Each file was frozen, with its SHA-256 in the matching `.sha256` file, before the code it tests. The two `final` sets were frozen after `exact-reducer.7` was live. The `closing` set was frozen after `exact-reducer.8` was live and before the last reader change. AMOS wrote them. They are not the evaluator's private cases, and passing them does not stand in for an independent rerun.

| Set | Contents | Use |
|---|---|---|
| `r14-direct-dev` | 4 domains x 6 evidence variants x 5 effects x 2 profiles (240 rows) | Guided the repairs |
| `r14-direct-holdout` | 8 other domains, same design (480 rows) | First scored on `exact-reducer.7`. One domain exposed a gap that was then fixed. |
| `r14-audit-dev` | The eight audit classes in the letter, with clean siblings, 2 profiles | Guided the repairs |
| `r14-audit-holdout` | The same classes in different wording and field shapes | First scored on `exact-reducer.7`. In the strict profile, two cases are refused because their privacy envelope is incomplete; that refusal is correct. |
| `r14-direct-final` | 4 further domains, same design (240 rows) | First scored on `exact-reducer.8`. One domain exposed a gap that was then fixed. |
| `r14-audit-final` | The eight classes in new wording, with clean controls | First scored on `exact-reducer.7` and `exact-reducer.8` |
| `r14-direct-closing` | 4 further domains, same design (240 rows) | Scored once on the shipped build and not used for further fixes |

The evidence variants are: complete, irrelevant addition, missing dependency, conditional, revoked and prohibited. In the missing variant, stakeholder-support and demand records are present and the completion or permission claim is absent. The expected state there is `insufficient` for the recommendation and every external effect, and `favorable` with `planning_only` for internal planning.

The first version of the two audit files used field values the API rejects. They were corrected and re-frozen before any engine change, and the digests here are the corrected ones.

```
MVR_API_KEY=... node conformance/effect-decision/r14/run-live.mjs r14-direct-holdout --out direct.json
MVR_API_KEY=... node conformance/effect-decision/r14/run-live.mjs r14-audit-holdout --out audit.json
```

The rules read bounded English text and declared fields. They do not authenticate sources, and no result here confers permission.
