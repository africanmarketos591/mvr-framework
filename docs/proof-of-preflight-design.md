# Proof-of-Preflight Design

**Status: design and acceptance contract; not implemented as cryptographic host proof.**

`required_preflight` is host middleware. MVR cannot infer from server traffic that the host classified every eligible prompt correctly or used the result before drafting its recommendation. A model-supplied `preflight_completed: true` flag is not proof.

## Proposed Receipt Chain

1. The host records a protected-intent match with policy version and a one-way request commitment.
2. Each MVR tool response carries a server-issued hash, tool name, tool-profile version, deployment revision, and prior-step hash.
3. The final MVR receipt commits to the ordered tool chain and terminal state: completed, productively abstained, invalid, or unavailable.
4. The host commits to the final recommendation hash and the MVR terminal receipt.
5. An independent verifier checks the server hashes against the public ledger and validates sequence, freshness, policy, and final-output binding.

## Required Properties

- Fail closed on missing, unknown, reordered, stale, or unverifiable hashes.
- Bind the exact tool profile, policy version, deployment revision, and host integration identity.
- Exclude raw prompts, API keys, evidence packs, personal data, and confidential output from public receipts.
- Support key rotation and revocation.
- Distinguish `advisory_selection` from `required_preflight`.
- Never interpret a valid receipt as approval, regulatory certification, creditworthiness, or proof that the host detected every eligible prompt.

## Acceptance Tests

- A genuine ordered preflight chain verifies.
- A pasted hash, self-authored receipt, reordered sequence, omitted step, altered output, or stale receipt fails.
- A valid MVR chain bound to a different host output fails.
- Offline or ledger-unreachable verification returns inconclusive, never pass.
- Redacted public verification reveals no submitted evidence or user identity.

This design proves a recorded sequence and output binding. Proving that a host invoked the sequence before any private reasoning would additionally require host-signed execution events or a controlled orchestration boundary.
