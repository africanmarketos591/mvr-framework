# Hosted review workflow — 24 October 2026

[Open the hosted workbench](https://africanmarketos.com/review-workbench/) · [Integration contract and guide](../../docs/hosted-review-workbench.md)

Release `2026-10-24.hosted-review.1` integrates the bounded review planner, hold ledger and before/after comparison into persisted AMOS review cases. Authenticated REST, licensed MCP and isolated evaluation use the same action handler and durable transaction. The keyless preflight remains read-only.

## Evidence and reproduction

- `deployment.json`: operator-observed provider version, exact uploaded/downloaded bundle hash, unchanged bindings/runtime/renderer and passing private CI reference. The private source is not independently reproducible from this public repository.
- `local-acceptance.json`: local REST, MCP, evaluation and SQLite/workerd acceptance, source expiry, account isolation, regression and mutation checks. These are operator-reported results; the public verifier does not pretend to rerun private code.
- `live-acceptance.json`: 24 checks against the actual hosted isolated evaluation, including persistence, competing updates, withdrawal and replay. The temporary session was closed and a subsequent call returned HTTP 401.
- `browser-acceptance.json` and `workbench.png`: browser interaction evidence for the hosted page. This is an agent-run engineering test, not measured human usability or independent validation.
- `manifest.json`: SHA-256 hashes of the published evidence and public runner. Hash consistency establishes publication integrity, not underlying source truth.

Run the offline integrity check and the public 6,912-case decision oracle:

```sh
node release-evidence/2026-10-24-hosted-review/verify.mjs
```

Repeat the hosted acceptance yourself with Node 24:

```sh
node conformance/review-tools/run-live.mjs --confirm-isolated-evaluation --output my-hosted-review-result.json
```

The live command creates bounded review records containing proprietary generated test data on `africanmarketos.com`. It needs no paid plan or pre-existing key, keeps temporary credentials in memory, closes the session on completion/failure and refuses a different deployment revision. Existing abuse limits still apply. It does not call Google Drive, signing services or an external executor. CI runs the offline verifier only; it does not continually create live records.

## What is closed and what remains

The tools are now hosted, persist across requests and enforce account roles, source bindings, case freshness and competing-update checks. Proposals are captured in an earlier server request; comparison causes come from current AMOS review state. A planning observation or declared hold closure cannot satisfy the separate source-review or authority gate.

The evaluation data is **proprietary generated test data**, not observed market events. Logical consistency is tested; actual source authenticity, institutional standing, delegation, original-page human review and analyst-time savings are not established by these tests. Existing protocol field names are retained for compatibility and do not change this provenance.

This release adds no paid service, Google scope, signing grant or new Cloudflare resource. It uses the existing hosting deployment and existing bounded evaluation surface. It does not demonstrate free unlimited hosting or alter provider billing configuration.
