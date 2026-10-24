# Hosted original-document review evidence

Release: `2026-10-24.hosted-review.4`.

This bundle records engineering acceptance for the six bounded workstreams described in [the implementation guide](../../docs/original-document-review.md). It distinguishes proprietary generated test data, retrieved public records and operator-observed deployment results. It does not certify independent institutional standing or market outcomes.

## Observable results

- Exact UTF-8 original registration and clause review: 26 checks through REST, MCP, isolated evaluation and SQLite workerd. The twelve source/model binding dimensions invalidate reliance, and restoring old values does not reactivate an old review.
- Guided browser workflow: upload, select, bind, review a saved claim without model editing, reject an unsaved binding change, display a restriction warning, complete a positive internal education appraisal and hold opening/assignment/closure, then revoke the evaluation. Windows line endings preserve the original clause; hostile HTML remains inert text. Desktop and mobile layout checks produce no page errors. The test uses fresh isolated evaluation credentials, not a real person's authenticated identity.
- Permission visibility: current issuer/dependency/expiry/residual state remains separate from planning observations. Registered originals with unresolved interpretations cannot produce a usable planning result. Withdrawing the case invalidates prior reviews.
- Evaluation: reconstructed Mbarara restriction scenario, positive internal education scenario, one short historical public DPF excerpt and a live public GLEIF reference retrieval. The original developer's undisclosed payload has not been reproduced.
- Resilience: competing updates serialize, retries do not duplicate documents, revocation survives actual SQLite runtime restart, and the registry adapter rejects timeout/outage/partition/oversized/mismatched responses. See measured values and unmeasured objectives in `resilience.json`.
- Register adapter: exact LEI lookup at a fixed public host; captured record contains retrieval time and response hash. It grants no institutional delegation or external permission.

The worker regression harness, lifecycle programmes, authority mutation checks and dependency audit are summarized in `local-acceptance.json`. `deployment.json` binds the tested source to the provider's actual uploaded bytes, CI result, deployment version and unchanged resource bindings. The initial local encoding defect was repaired before release; the final exact source passed CI.

## Reproduce

Offline integrity and consistency check:

```sh
node release-evidence/2026-10-24-original-review/verify.mjs
```

Fresh live acceptance (creates only a bounded isolated review evaluation and closes it):

```sh
node conformance/original-review/run-live.mjs --confirm-isolated-evaluation --output new-original-review-result.json
```

The browser interaction sequence is exported as `runBrowserAcceptance` from `conformance/original-review/browser-runner.mjs`, accepting an isolated Playwright page. The published live browser result used headless Microsoft Edge. The function opens an isolated evaluation and submits only the displayed proprietary generated test scenarios. Do not run it against a real private case or substitute private data.

`live-acceptance.json` includes the original test text, exact model and persisted passage receipt with hashes. It also records a final read showing that review was no longer current, followed by evaluation revocation and a rejected request. The historical receipt is not a current permission. No reference secret, API key, OAuth token or session credential is published.

## Limits that remain explicit

This is an operator-run engineering evaluation, not independent validation. Account roles do not manufacture institutional authority. Public registration does not prove delegation. Text and Markdown originals are supported; this release does not authenticate PDFs, scans or document signatures. The bounded text-conflict heuristic is not a legal interpretation engine. No real financial, contractual or other external action is authorized here.

Reported restart and revocation times are local samples, not production percentiles. Availability is an objective, not a measured SLA. There is no push-delivery or downloaded-copy recall guarantee, and no claim of atomic revocation across Google Drive. No new paid service, cloud resource or billing activation was requested for this release.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.
