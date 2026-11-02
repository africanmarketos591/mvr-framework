# Model-attributed passage readings (`mvr.interpretation-submission/1`)

A licensed response that issues interpretation tasks also issues `interpretation_submission`: a one-time, tenant-scoped slot bound to those exact tasks (claim hash, passage hash, allowed labels), the workflow and an expiry. Readings go to `mvr_interpretation_submission` (REST `/v1/interpretation-submissions`, action `submit`), never into a workflow continuation payload. Each model identity submits once. Every reading gets a stable code (`READING_ACCEPTED` or a named rejection). Conflicting readings from different models are kept. Readings route passages to review; they never authenticate a source, set a fact or grant permission. Only an accountable disposition (`dispose`: accept, qualify, reject_support, adverse) by a reviewer-role credential changes effect decisions, through `interpretation_submission_id` on `/v1/effect-decision`, and only for the effects that depend on that claim and record.

```
MVR_API_KEY=... [MVR_API_KEY_2=<a key in another tenant>] node conformance/interpretation-submission/run-live.mjs --out submission-live.json
```

Without a second-tenant key, the cross-tenant check is reported `NOT RUN`.

## Disposition stratum (the scale R9 measured)

`stratum-live.mjs` runs 24 licensed workflows over 8 lab scenarios, each with five requested effects: three external effects that depend on the claim, one internal planning effect and an unrelated control.

| Stratum | Workflows | What a reviewer does | Expected |
|---|---|---|---|
| reject | 8 | rejects both supporting passages | the 3 dependent external effects become `insufficient` (24 rows) |
| qualify | 4 | qualifies one supporting passage | the 3 dependent external effects become `conditional` (12 rows), none authorized |
| routing | 6 | (a model reads `unrelated` on a link declared `qualifies`, and `adverse` and `qualifies` on the supporting links), then marks one passage adverse | all 18 tasks route to review; the dependent effects leave `favorable` |
| withdraw | 3 | rejects both passages, then withdraws one rejection | the dependent effects are `favorable` again |
| supersede | 3 | rejects both passages, then supersedes one rejection with `accept` | the dependent effects are `favorable` again |

Every workflow also checks four things. Model readings alone change nothing. Each disposition names its reviewer and the readings it answers. The response lists exactly the three dependent effects as changed. Authority, execution and source authenticity (issuer check, identity status, `means_*`) never change. A disposition is recorded on the ledger's assurance ladder as `accountable_disposition_recorded`, which sits below every authenticity rung.

```
MVR_API_KEY=... node conformance/interpretation-submission/stratum-live.mjs --out stratum-live.json [--only 1,9,13]
```
