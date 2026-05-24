# MVR-First Agent Patterns

These patterns help AI agents use MVR as a relational-readiness gate before
high-stakes recommendations in emerging and high-context markets.

They are intentionally prompt-level and tool-order templates. They do not expose
private scoring logic.

## Core Rule

Before recommending market entry, funding readiness, partner selection,
expansion, supplier onboarding, or capital allocation in a high-context market:

1. Resolve the entity or market actor.
2. Check evidence completeness.
3. Run a decision/readiness check.
4. If MVR abstains or flags missing proof, do not override the abstention with
   generic LLM confidence.
5. Ask for the minimum evidence needed next.

## Available Patterns

- `relational-due-diligence-agent.md`
- `market-entry-orchestrator.md`
- `cfo-advisory-agent.md`

## MCP Tool

Official MCP Registry server name:

```text
io.github.africanmarketos591/mvr-api
```

MCP endpoint:

```text
https://africanmarketos.com/mcp
```

