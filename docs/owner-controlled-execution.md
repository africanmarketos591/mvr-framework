# Owner-controlled execution acceptance contract

Status: one bounded owner-operated live execution verified on 24 October 2026. The [public evidence package](../release-evidence/2026-10-24-owner-execution/README.md) includes the unchanged signed execution receipt, public-key archive, credential-free summary and runnable verifier. The private evidence audit passed 15 checks. A separate read-only experiment observed Google HTTP 401 after revocation in 1,022 ms. Public preflight remains read-only; no public MCP execution tool or production issuer activation is introduced.

The public worker also denies non-lab capability use with `PRODUCTION_AUTHORITY_NOT_ACTIVATED`: operator vetting, declared affiliation and possession of a signing key do not substitute for a provisioned current authority registry. The registry integration must verify institution, issuer and reviewer standing and current revocation within the applicable scope. Its trusted-host test double is explicitly lab evidence. No production registry is provisioned by these source changes.

Farouk Mark Mukiibi is the designated accountable key-policy custodian and human approver in his capacity as AMOS founder/operator. This remains a declared affiliation, not proof of incorporation, Gatsby delegation or independent institutional standing. Google IAM manages the signing-key material; the owner account controls IAM policy. There is no separately appointed independent human key administrator. An AI agent is not that administrator. Owner and approver are the same person; no two-person authorization is claimed.

## Verified owner-lab implementation and limits

The completed lab used separate testing-only Desktop OAuth clients for signing and Drive, two dedicated service-account signers without exported keys or resource roles, and temporary resource-scoped `signBlob` grants. Billing stayed unlinked. No paid KMS service or free trial was activated. The grants were configured to expire at 18:00 EAT on 24 October 2026; expiration is a configured boundary, not a claim that a later IAM observation has occurred.

The testing app did not receive Google's `auth_time` claim. The strict Google-freshness verifier remains unchanged. A distinct `google-signed-account-plus-webauthn-uv/1` profile verified the signed account token and required a fresh, user-verified passkey assertion bound to the exact intent. Google token issuance time was not treated as authentication time. The challenge, approval and one-use consumption were persisted before signing.

The approval service retained the signing credential and approval database; executor and receiver child processes received only the Drive credential and fixed plan. This is process separation on a trusted owner-operated host, not independent workloads or a sandbox against a compromised OS account. Production isolation requirements below remain requirements.

The actual folder and file were created using reserved IDs, read back by separate processes and checked for exact owner, parent, names, request/manifest references and content hash. The signed receipt binds the private approval hash and readback evidence. Local revocation and replay denial passed. The original provider-token propagation observation was missed and is not rewritten as success: a separate no-write grant performed the measured before/revoke/HTTP-401 check.

An online SQLite backup of both actual lab databases was restored to isolated copies. Integrity, exact records, consumed-approval rejection and revoked-dispatch rejection passed. No live database was moved. This closes a local recovery drill, not offsite disaster recovery or production reliability validation.

## Production isolation prerequisites and reproduction contract

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

Each new execution remains inactive until the owner reviews and explicitly approves its concrete target, permissions and action. Today's consumed approval cannot authorize another write. Credentials and private keys never enter model arguments or this document.

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

References: [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Google-managed IAM signing](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signBlob), [project-wide token revocation](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke).
