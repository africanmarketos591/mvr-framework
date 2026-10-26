# Release evidence: 2026-10-26.favourable-path.2

This is AMOS lab verification of the release that answers the outside review of review-feedback.1. Everything here comes from:
- AMOS's own tests;
- live checks against production, using disposable lab keys and isolated lab sessions;
- read-only provider checks.

It is not independent review. No real institution, issuer, reviewer or operator took part.

`2026-10-26.favourable-path.1` was deployed first and superseded the same day. Its licensed production check found that a residual closure made the review tools stale, so a later adverse clause review was refused. `.2` fixes the binding. Every live file here was recorded against `.2`. The `.1` records are kept in the operator's kit and are not evidence of this release.

Run `node verify.mjs` to check every file hash and every claim below.

## The review's acceptance tests, live

| Review item | Where it is shown |
|---|---|
| P1: a clean, matched, current three-source case reaches a bounded internal recommendation after designated reviews | `live-favourable-path.json`, check `acceptance 1`; `live-licensed-favourable.json` |
| P1: one adverse clause withdraws only the effects that use it | `live-favourable-path.json`, `acceptance 2`; `live-licensed-favourable.json` |
| P1: an irrelevant passage reopens nothing | `live-favourable-path.json`, `acceptance 3` |
| P1: the transition replays from history | `live-favourable-path.json`, `acceptance 4`; `live-licensed-favourable.json` replays the production journal |
| P2: both prose cases route the exact passage with no caller `contradicts` | `live-favourable-path.json`; `live-licensed-favourable.json` (licensed preflight) |
| P2: only strong wording holds a claim; conditional or negated wording is review-first | `live-licensed-favourable.json` |
| P2: model readings route review on REST and on the MCP decision-check tool, and never set a value | `live-licensed-favourable.json`; `live-favourable-path.json` |
| P3: a permission statement says who asserted the reviewer's standing, how it was checked, when it ends and which effect rests on it | `live-favourable-path.json`; `live-licensed-favourable.json` |
| P4: a customer receiver performs each commit once, across a restart | `live-receiver-staging.json` (reference staging receiver, SQLite store, real lab commits); `live-authority-conformance.json` |
| P5: stable credential answers; clients pin the revision; every published example runs as published in both profiles; closed authority responses | `live-licensed-favourable.json`; `local-acceptance.json` |
| Repeat the issuer-state/2 run with the exact `create_draft_record` fixture | `live-issuer-state-v2.json` (14 of 14). `issuer-state-v2-live-before.json` is the same runner before this release: 12 of 14, and the alias of a prohibited action was left at `planning_only` |

## All files

| File | What it shows |
|---|---|
| `deployment.json` | Provider version and deployment; bundle bytes match; bindings and renderer unchanged; rollback version; pull requests |
| `local-acceptance.json` | Every `worker-ci.yml` node command on the released head, the Python release checks, and the reports of this release's suites |
| `live-favourable-path.json` | The public favourable-path conformance (`conformance/favourable-path/run-live.mjs`) in the production lab |
| `live-issuer-state-v2.json`, `issuer-state-v2-live-before.json` | The issuer-state/2 lab run with the exact fixture, after and before this release |
| `live-receiver-staging.json` | The reference staging receiver fed with real lab commits, faults injected, then restarted |
| `live-licensed-favourable.json` | Licensed production checks with five disposable 20-minute lab keys, revoked afterwards |
| `live-licensed.json` | Earlier releases' licensed checks, re-run |
| `live-examples-unchanged.json`, `examples-unchanged-before.json` | Every published request example sent unchanged, with no dependency handling, in both profiles, after and before this release. Recorded, not judged: 18 of 78 rows still fail this way (29 of 76 before). They need state from an earlier call, or a plan or role this one key lacks. The documented runner (in `live-licensed-favourable.json`) supplies both, and every example passes |
| `live-clean-room-evaluation.json` | The clean-room example flow on the keyless isolated evaluation route, validated against the live schemas |
| `live-authority-conformance.json` | The full authority conformance in production, with the customer receiver kit |
| `live-adversarial.json` | The adversarial suite in production: two lab sessions |
| `live-canary.json` | The read-only canary: one serving revision equal to this release |
| `issuer-state-v2-check.json` | The separate Python implementation reproducing every published issuer-state vector |
| `live-release-gate.json`, `live-permission-path.json`, `live-original-review.json`, `live-ceremony-production.json` | Regression of earlier releases' live checks. Still no receipt key and no ceremony |
| `page-check-production.json`, `*.png` | The ceremony page in a headless browser |
| `production-api-shape.json` | Read-only: the newest version is the deployed one, and no receipt-key secret exists |

## Not established

- **Who.** No design partner, real institution, issuer, reviewer or operator took part. Every designation, review and effect here is a lab fixture.
- **Customer staging.** The receiver ran against AMOS's reference staging receiver, not a customer's system.
- **Review prioritisation.** Model readings are recorded with attribution and route review. Nothing here shows that recording them improves how review is prioritised.
- **Signed production receipts.** Production receipts stay unsigned until the witnessed key ceremony.
- **Outcomes.** The paid pilot has not run; the pilot-study harness is tested on lab fixtures only.
- **General security.** The adversarial results describe these lab conditions only.
