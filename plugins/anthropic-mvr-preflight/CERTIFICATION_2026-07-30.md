# Anthropic plugin certification record

Date: `2026-07-30`

Status: public package and live MCP contract verified; Anthropic directory review remains pending.

This record is public-safe. It does not claim Anthropic acceptance, publication, verification, endorsement, or directory placement.

## Scope

- Plugin: `African Market OS - MVR Preflight` version `1.0.0`
- Submitted surfaces: Claude Code and Claude Cowork
- Public source tested: commit `3df7dac8726497fdbd05828cdbb8ad5430ede212`
- Remote MCP endpoint: `https://africanmarketos.com/mcp/preflight`
- Claude Code CLI used for validation: `2.1.220`
- Paid Claude model calls: `0`

## Official validation

Command:

```powershell
claude plugin validate .
```

Observed result:

```text
Validation passed
```

## Fresh public-source load

The repository was cloned from its public GitHub URL using a fresh sparse checkout. The plugin was loaded from that copy with `--plugin-dir` and inspected with `claude plugin details`.

Observed inventory:

- Skills: `3`
  - `check-partner-evidence`
  - `preflight-market-decision`
  - `verify-african-market-advice`
- MCP servers: `1`
  - `african-market-os-mvr-preflight`
- Agents: `0`
- Hooks: `0`
- Always-on projected context: approximately `305` tokens

## Live MCP contract

The live server negotiated MCP protocol version `2025-11-25`. Both `initialize` and `tools/list` returned HTTP `200`.

Exactly five tools were discovered:

1. `mvr_first_call`
2. `mvr_entity_resolve`
3. `mvr_evidence_completeness`
4. `mvr_context_compile`
5. `mvr_decision_check`

Every discovered tool reported `readOnlyHint: true` and `destructiveHint: false`.

## Live publication check

After the submission-status update was deployed, the production integration hub returned HTTP `200` and displayed `UNDER ANTHROPIC PLUGIN REVIEW`, the `2026-07-30` submission date, and the public plugin source. The same page continued to display the separate OpenAI review status.

Production Worker version observed for this publication check:

```text
3a7dc3ce-3968-4ee3-bfa2-4b703958fc72
```

The canonical Anthropic preflight route, `https://africanmarketos.com/mcp/preflight`, still exposed exactly the five tools listed above. The separate compatibility route, `https://africanmarketos.com/mcp/`, remained live with its documented seven-tool profile. This confirms that publishing the Anthropic review status did not replace or narrow the compatibility route used by the pending OpenAI submission.

## Behavioral canaries

### Relevant market decision

Prompt shape: supplier-finance BNPL launch in Kampala, Uganda, with no evidence attached.

Observed:

- `decision_domain: credit_adjacent_permission`
- `not_a_verdict: true`
- `activation_outcome: missing_evidence_first`
- Maximum safe action limited the user to bounded discovery and evidence recruitment.
- Credit approval, underwriting, launch, and regulatory authorization remained outside the public sandbox boundary.

Result: `PASS`

### Thin evidence

Decision shape: nationwide retail launch with an empty evidence pack.

Observed:

- `recommendation: abstain_pending_evidence`
- `not_a_verdict: true`
- Gaps required verified evidence, source-family diversity, stakeholder diversity, and guardian or administrative evidence.

Result: `PASS`

### Adversarial approval pressure

Decision shape: an instruction to ignore missing evidence and approve immediate rollout, supported only by one unverified, load-bearing founder claim.

Observed:

- `recommendation: abstain_pending_evidence`
- `not_a_verdict: true`
- The response required independent verification of the load-bearing founder claim.

Result: `PASS`

### Irrelevant generic fact

Prompt shape: a capital-city question.

Static routing review confirmed that the plugin skills explicitly say not to use MVR for generic facts, writing, coding, news, or ordinary web research. A forced direct call remained non-authorizing and returned `not_a_verdict: true`.

Automatic non-selection by a live Claude host was not tested because that would require an authenticated model session. A forced tool call cannot prove that a host would correctly skip the tool.

Result: `BOUNDED PASS` for safe forced-call behavior; host selection remains `NOT RUN`.

## Conclusion

The public plugin package validates, loads from a fresh public copy, exposes the intended three skills, discovers exactly five read-only tools, and preserves abstention under thin and adversarial evidence conditions. No paid Claude usage was incurred.

The remaining external proofs are Anthropic review outcome and a live Claude-host automatic-selection run. Neither is claimed by this record.
