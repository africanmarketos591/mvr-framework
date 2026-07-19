# Outcome Calibration Ledger Runbook

MVR already exposes the governed receiving path for real-world outcomes:

- `POST /v1/outcome-feedback`
- `POST /v1/calibration-review`
- `POST /v1/backtest-case/submit`

This runbook operationalizes those routes. It does not create a second outcome database, and an outcome submission never changes the live engine automatically.

## Enrolment at Decision Time

Record the decision reference, immutable receipt hashes, predicted verdict, confidence, authorization boundary, target geography, archetype, decision date, expected observation horizon, and named owner. Schedule check-backs appropriate to the case, normally at 6, 12, and 18 months. A shorter pilot may use an earlier check-back, but it must not silently replace the preregistered horizon.

## Outcome Submission

Submit only an observed outcome with its date, source class, evidence reference, and the operator's relationship to the case. Preserve unknowns and contradictory evidence. Never convert silence into success; use the doctrine-governed presumed-dead rule only where its conditions are satisfied.

Do not place raw personal data, confidential contracts, account records, or complete interview transcripts in the calibration queue. Store governed references or redacted evidence packages instead.

## Review Boundary

`/v1/outcome-feedback` queues an observation for governed review. It is not a calibration write. Incorporation requires an authorized calibration review, documented inclusion or exclusion reasons, conflict checks, and a named reviewer or countersignature. The live model must not learn directly from a founder's self-reported result.

## Publication

Publish aggregate calibration only after the cohort definition, denominator, horizon, exclusions, and settlement status are locked. Report misses and abstentions alongside successful calls. Never describe synthetic backtests or unresolved outcomes as realized predictive accuracy.

Minimum public fields:

- cohort and geography
- decision and outcome horizons
- number enrolled, due, settled, lost, and excluded
- verdict distribution
- outcome distribution
- calibration error or survival delta with uncertainty
- policy, calibration, and deployment versions

The asset is the settled, review-governed history. The route already exists; disciplined enrolment beginning now is the time-sensitive work.
