# Model-attributed passage readings (`mvr.interpretation-submission/1`)

A licensed response that issues interpretation tasks also issues `interpretation_submission`: a one-time, tenant-scoped slot bound to those exact tasks (claim hash, passage hash, allowed labels), the workflow and an expiry. Readings go to `mvr_interpretation_submission` (REST `/v1/interpretation-submissions`, action `submit`), never into a workflow continuation payload. Each model identity submits once. Every reading gets a stable code (`READING_ACCEPTED` or a named rejection). Conflicting readings from different models are kept. Readings route passages to review; they never authenticate a source, set a fact or grant permission. Only an accountable disposition (`dispose`: accept, qualify, reject_support, adverse) by a reviewer-role credential changes effect decisions, through `interpretation_submission_id` on `/v1/effect-decision`, and only for the effects that depend on that claim and record.

```
MVR_API_KEY=... [MVR_API_KEY_2=<a key in another tenant>] node conformance/interpretation-submission/run-live.mjs --out submission-live.json
```

Without a second-tenant key, the cross-tenant check is reported `NOT RUN`.
