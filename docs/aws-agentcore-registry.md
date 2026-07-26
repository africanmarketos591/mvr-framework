# AWS AgentCore Registry Integration

Status: public sandbox recipe; not a production or Marketplace claim  
Last verified: 2026-07-26

African Market OS already exposes a public five-tool Streamable HTTP MCP preflight. AWS Agent Registry can synchronize that endpoint into an AWS account so an operator can inspect the discovered tool definitions. Synchronization creates a catalog record; it does not attach the tools to a model or cause invocation by itself.

## Safe Registration Target

```text
Descriptor type: MCP
Endpoint: https://africanmarketos.com/mcp/preflight
Credential type: None
Expected tools: 5
```

The endpoint is keyless, read-only, sandbox/evaluation access. It does not become licensed production merely because an AWS registry can discover it.

## Timing

AWS documents an Agent Registry namespace migration beginning 6 August 2026. Create the first account-scoped record after that migration and re-check the current namespace, IAM actions, CLI command, and supported protocol contract before execution.

## Required Canary

1. Synchronize the endpoint into a non-production AWS Agent Registry.
2. Confirm exactly five tools are extracted and inspect the record before publishing it.
3. Explicitly attach the approved record through an AgentCore Gateway, Runtime, or client/orchestrator. Registry synchronization alone is not an invocation path.
4. Run one relevant market-entry prompt and confirm `mvr_first_call` is selected first.
5. Run one irrelevant factual prompt and confirm MVR is not selected.
6. Run one adversarial approval prompt and confirm `not_a_verdict`, bounded evidence work, and human review remain intact.
7. Record AWS account, region, registry record ARN, invocation layer, date, tool definitions, traces, costs, and any failures without storing private evidence or credentials.

## A2A Boundary

African Market OS separately operates an A2A 1.0 preflight at `https://africanmarketos.com/a2a`, discovered through `https://africanmarketos.com/.well-known/agent-card.json`. It is not represented here as AWS-compatible while AWS documentation identifies a different A2A contract version and method vocabulary. Do not assume AgentCore translates between them.

## Marketplace Boundary

This recipe is not an AWS Marketplace listing. Paid Marketplace eligibility separately depends on the seller entity, jurisdiction, tax information, payout banking, KYC, support, and production-readiness requirements. No African Market OS Marketplace listing or AWS endorsement is claimed.

Canonical machine recipe: https://africanmarketos.com/mcp/aws-agentcore.json

Official AWS references:

- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry-sync-records.html
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-MCPservers.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/seller-eligibility.html
