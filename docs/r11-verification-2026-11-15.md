# R11 remediation and verification

The production API serves **2026-11-15.exact-reducer.4** under manifest `MVRRM-33425217dbd5a318aade447518f564ea`. Its deployed bytes matched the prepared bundle. All 39 live release-drift checks passed. The first measured Enterprise capabilities call after deployment took 1,652 ms end to end. [Deployment and measurements](https://github.com/africanmarketos591/mvr-framework/tree/main/release-evidence/2026-11-15-r11)

## Authority and receiver enforcement

Authority-bearing clients must send the explicit resource, contact flag, counterparty, country, amount, currency and current binding on the outer effect. Unsupported duration, subnational scope and extra claim dependencies fail closed. The decision service obtained the current permission from the authenticated case and executor for the independently specified outer effect. The same zero-value, no-contact draft passed through REST and MCP in both profiles. All four responses carried the same normative decision hash. The verification ledger linked it to the outer effect hash and current authority binding. The signed commit covered the same effect ID and content digest. The conformance receiver recorded that commit ID exactly once.

A connected Enterprise conformance receiver observed the revocation in 2,417 ms and refused the pending commit within its delivery window. A separate subscriber stayed disconnected beyond its 60-second lease, refused delivery and then read the missed revocation on reconnect. The closed session had one positive marker and zero revoked markers. [Trace](https://github.com/africanmarketos591/mvr-framework/blob/main/release-evidence/2026-11-15-r11/live-binding.json)

A separately implemented Python receiver on GitHub passed all 14 delivery scenarios. Its read-only SQLite observer counted **1 positive draft and 0 drafts for the revoked commit**, before and after delivery. GitHub hosted the runner and AMOS supplied the workflow. Independent buyer operation still requires a buyer-owned receiver and draft-store record. [Receiver job](https://github.com/africanmarketos591/mvr-framework/actions/runs/43713153711/job/132808931433)

## Decision and applicability results

The AMOS comparison used eight market scenarios, six variants and five effects in each licensed profile. It scored **480/480 exact**. Missing-link precedence was 64/64, qualifier precedence was 64/64, false favorable was 0 and external authorizations were 0/288. The field-level results include precedence and the analytical, institutional and execution states. [Comparison](https://github.com/africanmarketos591/mvr-framework/blob/main/release-evidence/2026-11-15-r11/live-comparable.json)

Historical evidence accompanying an explicitly internal task stays background. A proposal to act on the market inside a claim keeps the request in scope. The exact route classified 16/16 internal controls correctly. The original five-tool workflow stopped at its first call for 16/16 internal controls and retained 16/16 external comparators in scope. The local six-surface suite also passed all 370 tasks on each surface. In a named missing-signature case, a designated fixture reviewer persisted an acceptance through the licensed review route. Both the external offer and the internal recommendation moved from insufficient to favorable analysis and remained `not_authorized` for execution. Across ten effect/profile rows, authority and execution broadened zero times. [Before and after](https://github.com/africanmarketos591/mvr-framework/blob/main/release-evidence/2026-11-15-r11/missing-disposition.json)

Eighteen new AMOS-authored passages across six markets were committed after the reader code was frozen and before scoring. Its first local pass was 18/18. Production scored 18/18, with 0 false favorable and 0 external authorizations. [Frozen cases](https://github.com/africanmarketos591/mvr-framework/commit/1a98decd50af5543129cd6a9a8af6ecd0e188dbe) · [Production wording results](https://github.com/africanmarketos591/mvr-framework/blob/main/release-evidence/2026-11-15-r11/wording-live.json)

## Specialized audit

The two previously published AMOS packs each contain 16 defects, seven clean controls and one internal control. These are distinct from the evaluator's pack. [Full audit results](https://github.com/africanmarketos591/mvr-framework/blob/main/release-evidence/2026-11-15-r11/live-audit.json)

| Profile | Pack | Detected | False permits | Clean false positives | Controlling | Targeted | Internal false triggers |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| full_advisory | heldout-r10 | 16/16 | 0 | 0 | 24/24 | 16/16 | 0 |
| full_advisory | heldout-r10b | 16/16 | 0 | 0 | 24/24 | 16/16 | 0 |
| strict_calibrated | heldout-r10 | 16/16 | 0 | 0 | 24/24 | 16/16 | 0 |
| strict_calibrated | heldout-r10b | 16/16 | 0 | 0 | 24/24 | 16/16 | 0 |

## Transport

The protocol fixed the cohort and the three-run rule before scoring. Each cell made one primary and one effect call. All three AMOS runs passed. The independent evaluator's original 108/112 primary first run remains in its record. [Raw transport runs](https://github.com/africanmarketos591/mvr-framework/tree/main/release-evidence/2026-11-15-r11)

| Run | Primary | Effect | Retries |
| ---: | ---: | ---: | ---: |
| 1 | 112/112 | 112/112 | 0 |
| 2 | 112/112 | 112/112 | 0 |
| 3 | 112/112 | 112/112 | 0 |

## Independent qualification and commercial status

The independent scores for the prior revision remain **85.39/100 supervised**, **49.13/100 portable permission infrastructure (HOLD)** and **35/100 commercial evidence**. The evaluator reported 292/480 comparable exact, 48 false favorable, 16/64 missing-link precedence and three critical audit false permits per profile. The evaluator shared the findings only. The original private inputs and expected labels were unavailable, so the measurements here use the documented AMOS cohorts.

Independent requalification remains open. The remaining buyer evidence is an operator-owned staging record showing both commit IDs and their draft counts. Model comparisons and the comparative commercial pilot remain unrun. No new model calls, buyer-value measurements or commercial scores are claimed.
