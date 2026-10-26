# MVR API Reference Clients

These are lightweight reference clients for the current public MVR API contract.
They are intentionally small and transparent so agents and developers can copy
the call pattern without relying on stale SDKs.

They are not official package-manager releases yet.

## Safety Boundary

- Default key: `mvr-demo-key-2026`
- Use: non-commercial evaluation only
- Response profile: `full_advisory`
- Output mode: `client_safe`
- Not allowed: production decisions, credit scoring, legal certification, model
  training, reverse engineering, or commercial resale

For production keys, contact `info@africanmarketos.com`.

## Clients

- Python: `sdks/python/mvr_client.py`
- JavaScript: `sdks/javascript/mvr-client.mjs`

Both clients expose the same safe starter calls:

- `auth_check`
- `entity_resolve`
- `evidence_completeness`
- `decision_check`

## Generated governance clients

[`scripts/generate-governance-client.mjs`](../scripts/generate-governance-client.mjs) generates these clients from the OpenAPI contract:
- `sdks/javascript/governance-client.mjs` and its `.d.ts`;
- `sdks/python/governance_client.py`.

`node scripts/generate-governance-client.mjs --check` confirms that the committed clients match `openapi.json`. CI also type-checks the declarations with TypeScript in a clean environment.

**Options.** Every client takes:
- **Timeout:** `timeoutMs` in JavaScript, `timeout` in Python.
- **Revision pin:** `expectedRevision` in JavaScript, `expected_revision` in Python. It sends `X-MVR-Expected-Deployment-Revision`; on any other revision the server answers 409 `DEPLOYMENT_REVISION_MISMATCH`.
- **User-Agent.**

Every result carries `deployment_revision` and `revision_matches`.

**If you call the API with Python's `urllib` directly, set a `User-Agent`.** The default `Python-urllib` agent is refused at the edge with Cloudflare error 1010. All AMOS clients send one.

## Permission and receiver tools

- [`permission-verifier.mjs`](javascript/permission-verifier.mjs) verifies a permission statement and its commit offline.
- [`receiver-sdk.mjs`](javascript/receiver-sdk.mjs) is the durable receiver, with monitoring and an HTTP surface. See [the receiver kit](../conformance/receiver-kit/README.md).
