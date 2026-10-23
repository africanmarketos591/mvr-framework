# Owner-controlled execution acceptance contract

Status: engineering preparation. No live owner authentication, managed-key signing, Drive write or independent institution onboarding is established by the lab tests. Public preflight remains read-only. The owner adapter is disabled by default and is not a public MCP execution tool.

The public worker also denies non-lab capability use with `PRODUCTION_AUTHORITY_NOT_ACTIVATED`: operator vetting, declared affiliation and possession of a signing key do not substitute for a provisioned current authority registry. The registry integration must verify institution, issuer and reviewer standing and current revocation within the applicable scope. Its trusted-host test double is explicitly lab evidence. No production registry is provisioned by these source changes.

Farouk Mark Mukiibi has designated himself accountable key-policy custodian and human approver in his capacity as AMOS founder/operator. This is a declared affiliation, not proof of incorporation, Gatsby delegation or independent institutional standing. The technical key administrator is not yet appointed. An AI agent is not that administrator. Owner and approver are the same person for this test; no two-person authorization is claimed.

## Exact activation prerequisites

1. Provision a dedicated OAuth application with `openid email https://www.googleapis.com/auth/drive.file`. Verify its granted scopes. Existing broad connector access is not runtime isolation. `drive.file` is per-file/application access, not a Google-enforced folder-only scope.
2. Provision the independent approval service, its own durable store and its own workload identity. Only that identity may use the managed signing key. The executor cannot write approval records, read identity tokens, sign approvals or change policy. Document the actual technical administrator and IAM evidence.
3. Authenticate the owner with a verified Google ID token for the exact OAuth client and expected subject. Require a fresh authentication time (at most five minutes), issuer, audience, nonce and signature verification. If the provider does not supply fresh authentication evidence, stop; do not infer freshness from an existing connector session. The connected profile currently inspected is not this authentication proof.
4. Show the owner the exact signed manifest: account, requested new root folder named `AMOS – Owner-Controlled Execution Lab`, folder bootstrap operation, reserved artifact ID, file name, constant content hash, one-use request ID, expiry, OAuth scopes and gateway policy. Folder creation is itself a write requiring approval. It is not performed during preparation. Once a folder ID exists, bind artifact approval to that exact ID; never select an existing folder by name.
5. Record explicit consent in the independent service using a short-lived, nonce-bound, CSRF-protected challenge. Persist the signed approval and consumed challenge atomically. A signature that has no active durable approval record is unusable. The executor must obtain a fresh current-status decision before dispatch.
6. Give the executor a dedicated token. Its gateway permits only the exact folder metadata read and one fixed-ID artifact upload. Give the independent receiver access only to that artifact's metadata/content. Neither component may search or list Drive contents. Verify these restrictions with actual IAM/gateway denial tests, not configuration declarations alone.

The fixed file is `AMOS-OWNER-EXECUTION-TEST.txt` with UTF-8 content (including the final newline):

```text
AMOS owner-controlled execution test. No personal, financial, client or confidential information.
```

The proposal remains inactive until the owner reviews and explicitly approves the concrete target, permissions and action. Credentials and private keys never enter model arguments or this document.

## Execution and recovery

`sdks/javascript/owner-drive-executor.mjs` requires a preallocated file ID, an atomic durable intent journal, a narrowly scoped token provider, fresh approval and an independent readback receiver. It persists intent before dispatch, verifies exact parent/name/request/manifest/hash on readback and records an immutable outcome. A timeout, provider error or lost acknowledgement becomes `unknown`, not success or safe failure. Retries reconcile the same file ID without dispatching another write. A conflicting request ID must be rejected by the journal.

The complete signed execution receipt must bind approval reference, managed signing-key version, manifest and artifact hashes, request ID, exact resource IDs, verified readback result and server timestamps. The standalone adapter returns execution evidence; deployment must persist and sign it through the independent receipt service. Its return value alone is not a managed signed receipt.

The separate transactional receiver commits its locally owned artifact, approval consumption and receipt in one transaction with current-status read-set and expiry fencing. This addresses revocation between verification and commit for that receiver. **It does not make Google Drive atomic with the approval database.** A Google request already in flight can complete after revocation. Revocation must stop admission immediately and retain an in-flight/unknown state until reconciliation. Do not report this as “no remote effect after revocation.” A stronger claim requires a provider-supported commit-time fence or shared transaction, which this Drive adapter does not provide.

## Proposed objectives and measurements

These are acceptance targets, not measured production promises:

| Property | Objective | Measurement and failure behavior |
| --- | --- | --- |
| Current authorization | Zero allow-cache reuse for a new effect | Record approval version and a fresh check per request; outage denies admission |
| Transactional revocation | No artifact commit after a conflicting revocation wins serialization | Barrier/race tests, durable audit ordering; retries recheck current state |
| Remote revocation | No new dispatch admitted after observed revocation; in-flight requests explicitly unknown | Record revocation/check/dispatch/readback times; no atomic remote guarantee |
| Revocation notification | p95 under 5 seconds, p99 under 30 seconds when services are healthy | Measure commit-to-receiver-ack, retry/deduplicate, reconcile journal gaps; notification is not permission |
| Status check | p95 under 500 ms, hard deadline 5 seconds | Timeouts fail closed; no stale cached allow |
| Authorization availability | 99.9% monthly successful fresh checks, measured separately from deny decisions | Report outage duration and error budget; no availability override of scope/revocation |
| Recovery | Zero acknowledged approval/effect loss; unknown intents reconciled within 1 hour during staffed operation | Durable volume/WAL backup and restore drill, journal-versus-provider comparison; no blind re-execution |

Test expired and altered manifests, wrong subject/audience/nonce, wrong folder/action, broad tokens, missing approval, consumed requests, revoked authorization, cached allow reuse, verifier/KMS/storage outages, lost acknowledgements, receiver tampering, partitions and concurrent revocation. Preserve failed attempts and their reason codes. Run actual provider and IAM tests after activation; local doubles establish implementation behavior only.

## What each evidence level unlocks

Public historical data can establish extraction behavior and reproducible retrospective calibration within its documented scope. Synthetic tests can establish rejection rules and state-machine behavior. The owner test can establish authenticated account control, bounded consent and a real harmless effect. None establishes an unrelated institution's authority, independent reviewer standing, local relationships or authority for financial/contractual execution. Those remain separate onboarding and validation requirements.

References: [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Cloud KMS asymmetric signing](https://docs.cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys.cryptoKeyVersions/asymmetricSign).
