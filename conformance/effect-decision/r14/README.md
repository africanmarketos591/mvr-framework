# R14 dependency and audit sets

These four sets were written on 18 November 2026 from the independent evaluator's R14 letter and the public contract. Each file was frozen, with its SHA-256 in the matching `.sha256` file, before any R14 code changed. AMOS wrote them. They are not the evaluator's private cases, and passing them does not stand in for an independent rerun.

| Set | Contents | Use |
|---|---|---|
| `r14-direct-dev` | 4 domains x 6 evidence variants x 5 effects x 2 profiles (240 rows) | Guided the repairs |
| `r14-direct-holdout` | 8 other domains, same design (480 rows) | Scored only on the deployed build |
| `r14-audit-dev` | The eight audit classes in the letter, with clean siblings, 2 profiles | Guided the repairs |
| `r14-audit-holdout` | The same classes in different wording and field shapes | Scored only on the deployed build |

The evidence variants are: complete, irrelevant addition, missing dependency, conditional, revoked and prohibited. In the missing variant, stakeholder-support and demand records are present and the completion or permission claim is absent. The expected state there is `insufficient` for the recommendation and every external effect, and `favorable` with `planning_only` for internal planning.

The first version of the two audit files used field values the API rejects. They were corrected and re-frozen before any engine change, and the digests here are the corrected ones.

```
MVR_API_KEY=... node conformance/effect-decision/r14/run-live.mjs r14-direct-holdout --out direct.json
MVR_API_KEY=... node conformance/effect-decision/r14/run-live.mjs r14-audit-holdout --out audit.json
```

The rules read bounded English text and declared fields. They do not authenticate sources, and no result here confers permission.
