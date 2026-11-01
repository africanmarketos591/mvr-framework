# Audit finding conformance (`mvr.audit-finding/1`)

Every audit route family (`/v1/claim-audit`, `/v1/release-check`, `/v1/board-safety-check`, `/v1/evidence-audit`, `/v1/evidence-validation`, `/v1/evidence-completeness`, `/v1/decision-check`, `/v1/context/compile`, `/v1/privacy-risk-review`) returns `audit_findings` and `route_audit_result`. Each finding carries a normalized defect code, its exact locus (claim, record, input path, effects), controlling state and precedence, severity, release and decision consequence, the smallest bounded remediation with its accountable role, a machine-checkable acceptance condition and residual uncertainty. A route that does not apply says `not_applicable`. Any release or execution hold elsewhere in the response is a global boundary, not a finding. The dictionary is public at `/v1/audit-findings/contract`.

Strict calibration is discoverable before submission at `/v1/audit-capabilities`. Strict `/v1/evidence-audit` has no certified anomaly model, so it answers HTTP 422, `audit_performed: false`, `STRICT_CALIBRATION_MODEL_NOT_CERTIFIED`, non-equivalent alternatives, and the structural findings, which need no calibration.

`cohort.json`: 16 single-defect cases and 8 clean controls (proprietary lab fixtures). `route-shape.mjs` adds only the fields each route validator requires. `scorer.mjs` computes the R8 measures per route and profile.

```
MVR_API_KEY=... node conformance/audit-findings/run-live.mjs --out audit-live.json
```
