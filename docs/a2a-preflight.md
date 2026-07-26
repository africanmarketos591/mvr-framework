# A2A Preflight

African Market OS exposes a public, stateless A2A 1.0 preflight for agent-to-agent delegation.

```text
Agent Card: https://africanmarketos.com/.well-known/agent-card.json
JSON-RPC endpoint: https://africanmarketos.com/a2a
A2A-Version: 1.0
```

The Agent Card declares six bounded skills for market entry, investor diligence, NGO/DFI deployment, fintech rollout, evidence completeness, and Reckless-GO risk detection.

This surface routes evidence requirements and abstention checks. It does not return a licensed production verdict, approval, certification, legal opinion, underwriting decision, or autonomous authorization. It persists no tasks, supports no streaming, and accepts no API key in message parts.

For tool-level invocation use the five-tool public MCP endpoint at `https://africanmarketos.com/mcp/preflight`. Licensed production currently uses tenant-scoped authenticated REST; the existing A2A and MCP endpoints remain sandbox/evaluation surfaces.

The current A2A implementation is not represented as compatible with platforms that document a different A2A contract version or method vocabulary. Verify host conformance against the live Agent Card and endpoint before claiming support.
