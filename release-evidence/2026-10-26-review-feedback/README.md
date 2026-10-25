# Release evidence: 2026-10-26.review-feedback.1

This is AMOS lab verification of the release that answers an outside review's engineering items. Everything here comes from:
- AMOS's own tests;
- live checks against production, using disposable lab keys and isolated lab sessions;
- read-only provider checks.

It is not independent review.

Run `node verify.mjs` to check every file hash and every claim below.

| File | What it shows |
|---|---|
| `deployment.json` | Provider version and deployment; bundle bytes match; bindings and renderer unchanged; rollback version; CI runs |
| `local-acceptance.json` | Every `worker-ci.yml` node command on the released head, the Python release checks, and the reports of the review-feedback suites: 9 of 9 weakened engines and 6 of 6 broken receivers caught; 15 of 15 broken vector files rejected; constructors rebuild accepted documents |
| `live-licensed.json` | Licensed checks with three disposable 20-minute lab keys, revoked afterwards. Earlier releases' checks are re-run, and the published request examples run through the generated client on the `client_safe` licensed route |
| `live-clean-room-evaluation.json` | The same nine example steps on the keyless isolated evaluation route, validated against the live published schemas, then the session is closed |
| `live-authority-conformance.json` | The full authority conformance in production, including the customer receiver kit fed with real lab commits |
| `live-adversarial.json` | The adversarial suite in production: two lab sessions; cross-session, confused-deputy, replay, altered-receipt, race and secret-exposure attacks, all refused or contained |
| `live-canary.json` | The read-only canary: one serving revision equal to this release, the generated client matching the live contract, and the issuer-state vector bindings |
| `frozen-comparison-live.json` | The comparison harness run against production on three proprietary example cases: the cases are frozen, and AMOS's output is recorded at the frozen revision. Nothing is scored, because no decisions or outcomes exist |
| `issuer-state-v2-check.json` | The separate Python implementation reproducing every published issuer-state vector |
| `live-release-gate.json`, `live-permission-path.json`, `live-original-review.json`, `live-ceremony-production.json` | Regression of earlier releases' live checks. Still no receipt key and no ceremony |
| `page-check-production.json`, `*.png` | The ceremony page in a headless browser. Framing is now denied by both the CSP and `X-Frame-Options` |
| `production-api-shape.json` | Read-only: the newest version is the deployed one, and no receipt-key secret exists |

## Not established

- **Who.** No real institution, issuer, reviewer or operator took part. Outcome, minute and cost figures are lab declarations.
- **Independent reproduction.** AMOS wrote the Python implementation of the issuer-state rules. An outside party's implementation is still to come.
- **Signed production receipts.** Production receipts remain unsigned until the witnessed key ceremony.
- **General security.** The adversarial results describe these lab conditions only, not every route or deployment.
