# Bounded owner-controlled execution, 24 October 2026

AMOS completed one owner-approved Google Drive creation under a dedicated testing project with billing unlinked. The owner used a passkey to approve an exact intent. Google-managed IAM keys signed the approval and execution receipt. Separate local processes created and read back the fixed folder and text file; the content hash and account ownership matched. Unauthorized, modified, replayed and locally revoked requests were denied.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

This is **owner-operated live engineering evidence**, not an independent institutional validation, customer deployment or production authority activation. The owner and approver are the same person. The local host is trusted; the child processes are not an adversarial OS security boundary. Public preflight remains read-only.

`engineering-acceptance.json` records 19 passing local suites covering restrictive-text conflicts, exact review binding, positive protected MCP, contracts/idempotency, extensible actions, typed conditions, reviewed issuer state, route boundaries and the owner-lab components. Each test source is hashed. These private-source tests are operator-run implementation evidence, not independently reproduced tests. `prior-deployed-boundary-acceptance.json` separately summarizes the earlier deployed synthetic release checks; it is not represented as a new run.

## Verify the published receipt

With Node.js 24.11 or later, no dependencies and no API key:

```sh
node release-evidence/2026-10-24-owner-execution/verify.mjs
node release-evidence/2026-10-24-owner-execution/verify.mjs --offline
```

The default run checks file digests, exact content hash, six tampering controls, the archived signature and the configured service account's current public key from Google over HTTPS. It does not trust a caller-selected key URL. Google rotates managed keys: if the signing key is no longer published, current-provider verification fails; offline verification can still establish mathematical validity against the archived key. An archived key is not proof of current trust or independent chronology.

The execution receipt is published without altering its signed document. Its service-account names and resource IDs are public evidence; resource IDs grant no Drive access. OAuth tokens, client secrets, account subject, passkey credential identifiers, passkey assertions and private approval-store records are omitted. The signed receipt commits to the private approval and manifest hashes. The private evidence audit passed 15 checks, but public readers cannot independently reperform those withheld identity and approval checks from this package alone.

## Revocation and recovery

The durable gateway revoked the consumed authorization and rejected another dispatch. Google accepted a project-wide token revocation. The original run did not observe provider propagation before clearing its token; that missing observation is preserved.

A separate **read-only** grant then read the existing artifact, requested revocation and observed HTTP 401 after **1,022 ms**. It created no additional artifact. This is one measured sample, not a p95/p99 estimate, production latency promise or evidence that the original token stopped at that exact time. Google documents project-wide revocation across OAuth clients in its [OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke).

An online SQLite backup of the actual lab approval and execution records was restored to isolated copies. Integrity and exact state checks passed; the consumed approval remained unusable and revoked dispatch remained denied. No live database was moved and no provider operation was performed. This proves local recovery behavior, not offsite disaster recovery.

After the actual approval expired, its unchanged managed signature was reverified against Google's current public key. All non-temporal admission fields matched. A fresh empty admission store rejected it using the actual wall clock and created no authorization record. The empty store excludes replay or prior revocation as the rejection cause. `real-expiry-denial.json` records this operator-run expiry check against the real approval. No expired write was sent to Drive.

After the live run, resource fencing was also hardened: separate request IDs cannot reserve the same creation resource, and an uncertain outcome retains that reservation across restart. This enhancement passed local competing-request tests; it is not retroactively claimed as part of the earlier live trace.

## What remains outside this proof

Independent institutional office/delegation, independent reviewer standing, production authority onboarding, adversarial workload isolation, provider-enforced folder-only OAuth, atomic remote commit/revocation and production reliability statistics remain unestablished. Race, outage and partition behavior have local fixture tests. Expiry denial was tested at the local admission gate with the real expired approval; no provider expiry-write experiment is claimed. A valid signature authenticates bytes under a key; it does not establish the truth or authority of every underlying claim.

For the gap ledger and permitted adoption levels, see [boundary closure evidence](../../docs/boundary-closure-evidence.md) and [owner-controlled execution](../../docs/owner-controlled-execution.md).
