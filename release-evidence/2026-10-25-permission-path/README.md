# Release evidence: 2026-10-25.permission-path.3

AMOS lab verification of the permission-path release. Everything here was produced by AMOS's own tests and lab runs against production with disposable lab credentials and proprietary lab fixtures. It is not independent review, customer validation or production acceptance. Public register snapshots are real public data.

Run `node verify.mjs` to check every file hash and every claim below against the files.

## What was released

- Original PDF review with deterministic `amos-pdf-text/1` extraction and a [public verifier](../../conformance/original-review/pdf/README.md).
- Six new free public register adapters beside GLEIF.
- Permission position (`check_permission`), commit-time check (`commit_effect`) and the review outcome ledger. See [permission path](../../docs/permission-path.md).

## Superseded builds

Two builds went live before this one; the licensed live check failed on each and the fix followed the same day.

- `2026-10-25.permission-path.1` (12:35 UTC): keys using the `client_safe` output mode got `status: ok` from `check_permission`, `commit_effect`, `record_effect` and the outcome ledger without the result fields, because the per-route output allowlists predated these actions. No decision changed; the isolated evaluation route was unaffected.
- `2026-10-25.permission-path.2` (13:17 UTC): a declared claim review held only by an unlinked evidence item gave an analysis position with no decisive review, and listed that item as unable to change the gate.

Every other file here is from `.3`.

## Evidence files

| File | What it shows |
| --- | --- |
| `deployment.json` | Provider version, deployment, bundle hash matched byte for byte, unchanged bindings and renderer, rollback version, CI runs. |
| `local-acceptance.json` | Every `worker-ci.yml` node command run on the released head, the new suites, Python release checks, the local browser test and the typing-focus regression (a reviewer typing a note while a passage bind finishes keeps the whole note). |
| `live-permission-path.json` | Isolated live evaluation: a PDF registered and reviewed in production, the receipt re-verified independently from the original file, all seven registers retrieved live, case position and outcome ledger, session closed and refused afterwards. |
| `live-permission-path-attempt-1.json` | The first attempt on this build, kept as run: World Bank timed out and SEC EDGAR returned an error status, both reported `unavailable` with a coded reason and no data (fail closed). Both answered normally minutes later; the rerun above retrieved all seven. |
| `live-authority-conformance.json` | The unchanged public conformance runner against production: permission positions before and after revocation, commit-time check stopping an effect revoked after verification, signed lab receipts verified offline. |
| `live-licensed.json` | Disposable licensed lab keys: protected and positive five-stage MCP handoffs, `check_permission` through the MCP authority operation, tenant isolation, licensed PDF and ledger, the analysis-level position on a claim-review hold; all keys revoked and refusal observed. |
| `live-release-gate.json` | The behavioural release gate replayed against production: authority leaks and protective failures. |
| `live-original-review.json` | Regression of the 24 October original-review acceptance against this release. |
| `superseded-builds.json` | Both superseded builds: provider version, source, finding, failed licensed checks, fix commit and test. |
| `superseded-permission-path-1-live-licensed.json`, `superseded-permission-path-2-live-licensed.json` | The failing licensed runs as recorded (key hashes only; keys revoked). |
| `pdf-corpus-statistics.json` | Aggregate extractor statistics on real PDFs kept on the operator's machine; no file names or content. |
| `*.png` | Local headless browser screenshots of the workbench (PDF passage review, permissions and registers, outcome ledger, phone width). |

## Not established

- No real institution, issuer or reviewer is onboarded; production capabilities stay closed until the named-person key ceremony.
- Customer-controlled receivers and effect-system fencing are untested.
- Outcome-ledger entries are declarations; no causal or monetary claim is made.
- No availability or latency commitment.
