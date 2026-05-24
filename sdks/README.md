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

