# Retest11 engineering decision

Target revision: `2026-09-30.outsider-retest11.2`.

## Finding and decision

**N17 confirmed independently against Retest10 production using both developer credentials.** `/v1/auth-check` returned 200 for `{"probe":1}` despite its deliberately empty request schema. This was a low-severity contract mismatch, not a demonstrated authentication bypass.

Enforce the published contract rather than relaxing it: omit the body or send `{}`. Nonempty objects now return 422 `AUTH_CHECK_BODY_NOT_EMPTY`, with bounded field names but no values. Malformed JSON and non-object bodies return 400; oversized requests return 413; excessive nesting returns 422. Header authentication still runs first. The existing size/depth-limited reader cancels an oversized streamed request. The legacy route alias behaves identically.

The first deployment (`retest11.1`) failed live acceptance because Cloudflare represented a bodyless POST as a non-null empty stream, unlike the original Node fixture. Production was rolled back to the verified Retest10 version. The corrected parser permits zero actual bytes only for this explicitly optional-body route, without trusting Content-Length or changing other routes. Regression coverage now includes closed/zero-length streams and both aliases in real workerd. Whitespace-only content remains invalid JSON. The failed attempt is retained in release evidence; it is not counted as a passing release.

Credentials and profile/output controls remain header-only on this route. Previously ignored body fields are an intentional compatibility tightening. No key entitlement, scoring formula, output authorization, calibration approval or storage binding changes.

OpenAPI describes examples as matching their schema ([official OpenAPI 3.0 specification](https://spec.openapis.org/oas/v3.0.3.html#media-type-object)). A syntactically valid body that violates this empty-object contract receives the existing API's 422 validation treatment ([HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-422-unprocessable-content)).

## Independent checks

- The supplied corpus contains exactly 908 HTTP records: 483 x 200, 17 x 201, 1 x 400, 1 x 401, 6 x 403, 23 x 404, 2 x 409, 373 x 422 and 2 x 503. Both 503 records concern `coverage=full` calibration health. This inventory does not prove that unrecorded network failures never happened.
- Fresh local auth checks cover both aliases, licensed profiles, sandbox, Bearer authentication, bodyless/empty requests, invalid header credentials, malformed JSON, non-object values, bounded error output, depth and declared/streamed size limits.
- Thirty actual REST responses validate against the published REST response schemas: positive and abstained decisions plus abstained decision-room, next-best-action and report-pack outputs, across both profiles and all three output modes. Snapshot lookup is used where supported; other routes receive an explicitly supplied decision result, not a claim of authoritative stored lookup.
- All 50 distinct published request examples execute in an isolated worker fixture with network calls blocked and synthetic credentials/in-memory stores. Forty-four return the expected 2xx response. Six assert specific missing-record or provenance prerequisites; arbitrary 4xx/5xx responses cannot pass. These are runtime checks in addition to the existing request-schema/example validation, not production submissions of example events, webhooks or approvals.
- The public zero-anonymous-POST gate remains mandatory across all eight specification mirrors. Its 32 mutation cases protect referenced/composed contracts and intentionally empty contracts. The full catalogue remains 179 POST operations; this guarantee is not a claim of perfect semantic completeness for every possible payload.

The private CI adds `scripts/test-retest11-contracts.mjs` alongside the existing owned request fixtures, historical-traffic audit option, published-example schema tests, MCP response tests and full regression suite. Deployment, provider identity, live acceptance, scoring replay and calibration reconciliation are verified separately; this decision document is not deployment attestation.

## Corrections and boundaries

The report's claim that the preceding round had no decision document is incorrect: [Retest10 engineering decision](retest10-engineering-decision-2026-09-30.md) was already published. Its 50-example count includes schema-level alternatives; the outsider's 48-example sample used a different selection rule.

Historical accepted requests are evidence to examine, not an unconditional compatibility mandate. The three old ROI unknown-control bodies, the outcome-ledger `eligible` field and this auth-check probe should not be grandfathered past the corrected contracts.

No quarantine is cleared, rehashed or silently retired. Active-manifest attestation and full-corpus attestation remain separate. Passing synthetic examples and replay checks does not establish outcome-validated accuracy, customer adoption, Dots host integration or Grok Bot execution. Those require their own evidence. No recurring monitor or customer outreach is created by this review.
