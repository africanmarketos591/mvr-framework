# Original-document review and bounded public-register discovery

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

Release target: `2026-10-24.hosted-review.3`. The hosted workbench uses the existing authenticated review-case route and isolated evaluation service. All new infrastructure requirements are zero; no paid provider or billing activation is introduced.

## Six workstreams and acceptance

| Workstream | Implemented scope | Evidence required |
| --- | --- | --- |
| Original-document review | Store exact UTF-8 text/Markdown bytes, hash on server, select exact passage, approve/reject/qualify interpretation, retain reviewer account and complete binding | REST, MCP, isolated evaluation and SQLite-backed runtime tests; altered passage/hash/identity denied; twelve binding dimensions invalidate reliance |
| Guided workflow | File selection, passage binding form, interpretation form, hold/owner/deadline/closure form; advanced JSON remains optional | Browser upload-to-review exercise, no page errors, warning visible |
| Permission visibility | Fresh case status, issuer records, dependencies, validity, residual risks and bounded next action | Existing authoritative case evaluation; withdrawal and source expiry invalidate displayed reliance |
| Broader evaluation | Reconstructed Mbarara restriction case, positive internal education case, public DPF historical excerpt, public GLEIF snapshot | Explicit provenance and source links; no claim to reproduce unavailable developer payloads or establish held-out accuracy |
| Operational resilience | Concurrent updates serialize; operation retry returns current state; withdrawal survives real runtime restart; registry timeout, oversized response, outage and partition fail closed | Measured samples in release evidence, plus existing failure-observability and durable-runtime suites |
| Public-register adapter | Exact LEI checksum, fixed GLEIF HTTPS host, no redirects or forwarded credentials, 5-second budget, 40 KB response cap, eight snapshots per case | Public live retrieval and deterministic failure tests; registration never becomes delegation or permission |

## Using the workbench

Open `/review-workbench/`, connect an existing case or start an isolated evaluation, and confirm redaction before uploading. Supported originals are `.txt` and `.md` files encoded in UTF-8, at most 12,000 bytes. The page preserves BOM and line endings. The server hashes the text's exact UTF-8 bytes. A text extraction from PDF is not the original PDF and must not be represented as one. Public source excerpts are explicitly excerpts.

Select a passage, enter the claim, relationship, subject, action, geography, validity and declared standing/model/extractor references, then bind it. The guided form creates one planning fact; advanced Boolean models can contain up to eight referenced facts. Review the passage and record an approval, rejection or qualification with a reason. The authenticated server supplies reviewer account, roles and timestamp. No integrator-supplied approval flag establishes authority.

Registered originals require a current approved interpretation before the bounded planning model is usable. Restrictive language against `direct_support` produces `DECLARED_RELATIONSHIP_TEXT_CONFLICT` and forces further review even if an account selects approve. This bounded lexical warning can overflag or miss language; it does not determine legal truth. Rejected and qualified interpretations also prevent a stable planning result. These receipts do not independently satisfy the production source-state standing gate, establish original authenticity or grant an external capability.

Every review binds the document hash, exact substring and UTF-16 offsets, target fact/claim, relationship, subject, action, geography, validity, declared reviewer-standing reference, model/extractor versions, whole-model hash, model revision and case basis. Model replacement invalidates old reviews even if old values are restored. Role/standing references remain declarations unless separately verified by the authority subsystem. Immutable historical receipts remain readable after expiry or withdrawal with current=false.

## Public reference sources

The GLEIF adapter implements a narrow subset of the [official GLEIF API](https://www.gleif.org/en/lei-data/gleif-api/). It preserves retrieval time, source URL, response hash, legal name, jurisdiction, registration status/update/renewal and register identifier. These are historical reference snapshots and require refresh at use. No signature, institutional delegation or revocation power is inferred from a registry entry.

The historical evaluation excerpt comes from the [Deposit Protection Fund of Uganda's EFC closure notice](https://dpf.or.ug/dpf-to-commence-payment-of-protected-deposits-to-depositors-of-the-closed-efc-uganda-limited-effective-january-29-2024/). It tests whether reported revocation conflicts with a declared unrestricted-operation claim. It does not assert present legal status or financial advice.

## Operational objectives, not certified service levels

Authoritative mutations must have zero stale-allow commits in deterministic race tests. Revoked review records must be unusable on the next successful authoritative read. Browser views are snapshots: users refresh, and every mutation revalidates; there is no push-notification delivery guarantee or recall of downloaded copies. Registry lookup must return unavailable within its 5-second application deadline and never infer permission from an outage. Local restart recovery target is under 30 seconds in the published fixture; measured samples do not establish production uptime. Availability objective for a future monitored service is 99.5% monthly, not a demonstrated SLA; no paid monitoring was enabled. Recovery must preserve immutable originals and revocation state. Existing owner-controlled Drive proof does not establish atomic commit-time revocation across Google's API.

## Remaining external and format limits

No independent institution has been onboarded by these tests. No independent reviewer identity, institutional mandate, organizational delegation, universal document authenticity or real market predictive accuracy is manufactured. Scanned/PDF original review, qualified digital document signatures, further registers and external transactional connectors need separate bounded implementations and evidence. This release establishes the supported text-original and LEI workflows rather than claiming universal coverage.
