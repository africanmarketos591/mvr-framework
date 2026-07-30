# Setup

1. Review this plugin's `README.md`, `.mcp.json`, and skills before enabling it.
2. Enable the plugin and approve the authless HTTPS connector to `https://africanmarketos.com/mcp/preflight`.
3. Confirm that tool discovery returns exactly five read-only tools and that each tool has a title.
4. Run one relevant prompt, one irrelevant prompt, and one adversarial prompt before production use.
5. Treat all public preflight responses as non-verdict outputs. Do not remove their evidence gaps, maximum-safe-action language, or human-review boundary when summarizing them.

No API key is needed for the public preflight connector. Licensed production REST access remains separate.
