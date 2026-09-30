# September 30 request-contract and historical-abstention correction

Target revision: `2026-09-30.outsider-retest9.1`.

## API changes

- All 179 POST operations now have explicit JSON request contracts. The 122 generic unrestricted-object fallbacks are removed across the complete catalogue, not just the public agent subset.
- Known fields, nested values, aliases, bounds and conditional action requirements are typed. Routes with no operation-specific input say so. Extensible metadata remains compatible with the runtime; accepting an extra field does not mean evaluating it.
- Typed inputs do not promote provisional or legacy routes to stable, grant access, authenticate sources or replace runtime checks. Authentication, tenant ownership, independent review, calendar validity and empirical calibration remain separate requirements.
- Historical Decision Room retrieval preserves source abstention and a null recommendation. New snapshots preserve abstention reasons. Older snapshots missing the original reason disclose that gap instead of inventing one; signed history is not rewritten.
- The `candidate_verdict_released` boolean is published in OpenAPI, `/v1/schema` and licensed MCP output schemas. `candidate_verdict_authorized` is a deprecated equal-valued compatibility alias. Neither field authorizes execution.
- `/v1/calibration-health?coverage=full` documents HTTP 503 for degraded attestation, including quarantine. Read `active_manifest_attestation_status` separately from `full_corpus_attested`.

## Reproduction paths

1. Read `/v1/openapi.json` or the checked-in full OpenAPI. Enumerate POST request schemas after resolving local references: 179 operations, zero unrestricted-object fallbacks. The focused agent OpenAPI deliberately exposes a smaller supported surface.
2. Generate an abstained assessment using complete, genuinely applicable inputs. Retain `decision_check_id`, then call `/v1/decision-room` with that identifier under the same authorized tenant/workspace. The source remains abstained; board summaries cannot turn it into a recommendation. Reassessment requires current complete inputs, not a renamed historical reference.
3. Inspect `CandidateScoreSummary` in OpenAPI or licensed MCP `tools/list` output schemas. The released-candidate flag is not an evidence completeness percentage, calibrated outcome probability, source verification or execution permission.

## Precise host-validation scope

Dots host integration and Grok Bot host execution remain unverified. Broader xAI Responses API remote-MCP compatibility, Grok.com custom-connector execution, and a bounded xAI selection benchmark have previously been verified. No Dots-vs-Grok comparative outcome study has been performed.

Existing evidence:

- [July 16 controlled API canary](../release-evidence/2026-07-16-read-only-preflight-mcp/RELEASE_EVIDENCE.json): three synthetic cases, 3/3.
- [Grok.com operator observation](../release-evidence/2026-07-16-read-only-preflight-mcp/GROK_COM_OPERATOR_OBSERVATION_2026-07-16.json): connector installation, five discovered tools and explicit first-call execution; the initial automatic-selection miss is preserved.
- [July 23 xAI selection benchmark](../evaluations/mvr-bench-selection-v0.1/results/2026-07-23-xai-responses-grok-4.5.json): 36/40 initially, 40/40 after remediation with frozen cases unchanged. This does not measure realized business outcomes.
- [Grok Bot activation evidence](../release-evidence/2026-08-20-grok-bot-activation): playbook published, actual host execution not certified.

[Dots memory](https://learn.chatgpt.com/docs/dots/tasks-and-memory) and [Grok Bot setup](https://docs.x.ai/grok-bot/get-started) describe separate host capabilities and access requirements. An xAI Responses API test cannot certify the Grok Bot app. Remembered context never substitutes for current sources, scoped permissions or a fresh AMOS evaluation.
