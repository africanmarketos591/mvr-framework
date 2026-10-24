# Hosted AMOS review workbench

The [review workbench](https://africanmarketos.com/review-workbench/) brings decisive-review planning, hold tracking and proposal comparison into the existing durable AMOS review workflow. It uses `/v1/review-cases`; licensed MCP forwards the same operations through `mvr_authority_operation` with `operation: review_case`.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

## Use it

Open the page and either connect an existing case using an appropriately scoped review API key, or start an isolated evaluation. The evaluation is free, bounded and expires after one hour. It uses **proprietary generated test data**, not observed market evidence or verified institutional standing. Its three evaluation principals do not authenticate three real people. Existing machine provenance fields remain present for compatibility and honest interpretation.

1. Load the case and its current revision. In an evaluation, inspect the generated model before saving it.
2. Save an explicit Boolean review model scoped to the case's `context_sha256`. A model may reference at most eight facts; each fact carries exact source, claim, scope, validity and reviewer-standing references. These references remain declarations until independently verified.
3. Record a planning observation using an account with an attestor, reviewer, compliance, owner or admin role. The server supplies account identity and time. An analyst cannot invent a reviewer identity in the request.
4. Record holds and their closure artifacts. Owners and deadlines remain unassigned unless supplied; a deadline requires an accountable commitment reference. Closing a declared hold does not close an AMOS permission gate.
5. Capture the original model proposal once, in a separate server request. Compare it with freshly evaluated AMOS review state. The server supplies the final review disposition and rule/basis references; the caller cannot provide a favorable final decision. Financial impact remains unestimated.
6. Refresh before relying on any result. Withdrawn cases, changed case bases and expired sources invalidate prior planning results. Close the evaluation when finished.

The browser keeps credentials in memory only, sends requests to same-origin routes and renders server content as text. Reloading drops credentials from the page; it does not itself revoke a provider-side session. Use the close button for immediate session revocation. Do not put private, personal or confidential data in the isolated evaluation.

## API contract

Discover the current contract at [`/v1/review-cases/contract`](https://africanmarketos.com/v1/review-cases/contract). New actions are:

| Action | Purpose |
| --- | --- |
| `get_review_tools` | Current model, observations, hold metrics, captured proposal and comparison |
| `set_review_model` | Case owner/admin installs or rebinds a planning model; old observations are cleared |
| `record_review_observation` | Reviewer-role account records a Boolean planning observation |
| `record_hold_event` | Case owner/admin records open, assign, close, reopen or abandon events |
| `capture_review_proposal` | Case owner/admin captures the original proposal once |
| `compare_review_decision` | Case owner/admin compares with current server review state |

Mutations require `operation_id`, `expected_revision` and `expected_tools_revision`. They share the durable case transaction, preserve immutable tool versions and reject conflicting writes. A retry of the same operation returns current state rather than reviving an earlier allowance. Source and case expiry are observed at commit. Models are limited to 32,000 characters, tool state to 150,000 characters, and each case to 60 tool revisions/hold events.

```json
{
  "operation": "review_case",
  "request": {
    "action": "get_review_tools",
    "case_id": "RC-<your-case-hash>"
  }
}
```

Use this envelope as arguments to licensed `mvr_authority_operation`. For REST, send the inner request to `/v1/review-cases` with your existing account credential. Do not put credentials in the JSON body or a model prompt.

## What the integration establishes

The hosted service now persists planning records with account attribution, server timestamps, revision checks and current-state evaluation. The same acceptance flow is exercised over REST, MCP, isolated evaluation and workerd with SQLite-backed durable objects. The local solver retains its public exhaustive oracle. [Release evidence](../release-evidence/2026-10-24-hosted-review/README.md) distinguishes local checks from hosted observations.

Account control is not independently verified institutional standing. A Boolean observation is not a source-state review event and does not satisfy the existing separate-account source review requirement. The page is not an original-document viewer. A stop certificate applies only to its declared planning model and bindings, not all possible omitted real-world risks. Proposal comparison concerns internal review readiness, not a complete market verdict. Public preflight remains read-only; production authority and external execution gates are unchanged.
