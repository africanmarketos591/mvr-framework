# MVR Host Policy Modes

MVR supports two host-side adoption modes. They answer different questions and must not be reported as the same experiment.

## `advisory_selection`

MVR is installed or registered and the host may select it when the request matches the published tool description.

This mode measures semantic tool selection. It is probabilistic. A host that does not call MVR cannot be counted as a successful MVR workflow.

## `required_preflight`

The host's governed intent policy requires the canonical five-tool MVR sequence before a confident recommendation for protected African or explicitly high-context market actions, including entry, launch, scale, investment, funding, partnership, procurement, deployment, lending, and credit.

```text
protected request
-> host intent policy
-> MVR first call and evidence sequence
-> complete, abstain, fail, or request evidence
-> bounded host response
```

If the classifier is uncertain, the host must route the request to policy review. If the preflight is incomplete, fails, is unavailable, or abstains, the host must not convert that result into a confident GO.

The public MCP endpoint is sandbox/evaluation only. Completing it is not production authorization.

## Reference Boundary

The published Python and JavaScript clients contain a transparent reference classifier. It is middleware, not semantic proof. Enterprise hosts should bind the same release rules to their own governed intent system and preserve a trace for MVR-Bench Selection scoring.

Canonical quickstart: `../mcp/README.md`

Selection benchmark: `../evaluations/mvr-bench-selection-v0.1/README.md`
