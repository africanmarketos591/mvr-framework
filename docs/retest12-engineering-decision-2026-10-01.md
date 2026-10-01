# Retest12: independent engineering decision

Target revision: `2026-10-01.outsider-retest12.1`.
Independently exercised baseline: `2026-09-30.mac001-review.1`.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

## Findings and action

**N18 is confirmed.** A fresh, synthetic caller-written memory verdict appeared in `project_memory_context.last_verdict_summary` and `decision_rhythm.change_summary.caller_memory_summary` in both client-safe and board-safe decision answers. It was marked unverified and execution remained blocked, but a downstream summarizer could still quote its conclusion or confidence. This is an output-minimization issue, not a demonstrated permission bypass.

Shareable outputs now retain only a presence marker for that unverified summary: `present`, `content_omitted`, caller-authored origin, `receipt_verified:false`, `instruction_authority:none`, and the no-execution boundary. Caller conclusion, confidence, claimed date, decision ID and hash are omitted. The change covers both late agent-experience annotation and recursive output serialization, including older nested summaries and export/Excel projections. Valid server-backed history remains available; caller flags cannot create a verified receipt.

`internal_full` intentionally retains diagnostic context. Explicit full working-memory retrieval remains an editable caller-owned context surface; `GET /v1/project-memory/{project_id}?view=agent` remains the minimized retrieval path. Neither is evidence or current permission. Unsupported output modes on decision-check and decision-rhythm remain rejected; this release does not expand their mode permissions.

**N19 is confirmed.** Two validators checked the same nested score and produced differently worded duplicates. Decision-check now uses one check for root scores and its existing shape/type/range checks for nested scores. Invalid inputs still fail; valid endpoints, bounded executive scalars, error totals and the existing 100-message truncation ceiling remain covered.

**Timeout allegation is not established as a server defect.** Read-only inspection of 171 persisted completion records from 06:05 to 06:15 UTC on October 1 found 44 decision-check records, a maximum recorded decision duration of 5.065 seconds, and no completed request over 120 seconds. Completion logs are not exhaustive start telemetry. The failed client request had no response ray/request ID, so no exact end-to-end attribution is claimed. No speculative global deadline or mutation retry was added.

## Report reconciliation

Independent enumeration confirms 1,139 supplied raw call records and the reported status totals. Both recorded 503s are full-coverage calibration-health responses; three records have no response. Supplied evaluator scripts were not executed. These counts attest the saved records, not unrecorded network activity or real-world outcome accuracy.

The report's claim that there was no separate decision document is incorrect: [Retest11](retest11-engineering-decision-2026-09-30.md) and the [Mac review](mac001-r11-engineering-decision-2026-09-30.md) both have published dispositions. This decision is linked from the repository README to improve discovery.

The description that `bounded_output_use_status` "replaces" the legacy field needs qualification: the explicit field is preferred, but the deprecated `authorization_status` alias is still retained for response-contract compatibility. Its scope remains bounded output use, never execution authority.

## Verification and unchanged boundaries

The focused regression exercises 49 actual Worker requests and 10 direct projection checks: both profiles, supported and rejected modes, raw versus minimized memory access, forged flags, verified receipts, nested/legacy summaries, valid score boundaries, scalar compatibility, and error truncation. The previous Retest11 and Mac regression suites remain in CI. Full-suite, exact-commit CI, unchanged-scoring replay, credential scanning and production acceptance remain required release gates.

All 179 POST request contracts remain explicit. Broad 200-response typing remains 32 of 246 operations; this is not a claim of full response-catalogue coverage. No scoring model, execution authority, quarantine, approval, external delivery or account entitlement is changed. Active-manifest attestation and full-corpus attestation remain separate. No periodic automation was created from the evaluator's suggested schedule, and no outcome-validated superiority is asserted.

## Primary references

[Cloudflare's Worker limits](https://developers.cloudflare.com/workers/platform/limits/) distinguish wall-clock duration from CPU time and describe what can happen when clients disconnect. This supports keeping attribution bounded; it does not identify the cause of these particular client failures.

[MCP security guidance](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) describes prompt-injection and session-context risks. Removing unverified conclusions from shareable decision answers reduces unnecessary exposure; hosts must still treat retrieved caller data as untrusted, not instructions or authorization.
