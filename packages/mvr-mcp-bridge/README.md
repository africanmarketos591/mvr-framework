# MVR MCP stdio bridge

This package is a small open-source transport bridge to the canonical African Market OS remote MCP preflight:

```text
https://africanmarketos.com/mcp/preflight
```

It exists for MCP hosts and directory evaluators that require a locally runnable stdio server. It discovers and forwards the same five keyless, read-only tools exposed by the remote profile. It does not contain the protected MVR scoring engine, calibration assets, private labels, customer data, or credentials.

## Run locally

```bash
cd packages/mvr-mcp-bridge
npm ci
npm start
```

Or build the repository-root Dockerfile:

```bash
docker build -t mvr-mcp-bridge .
docker run --rm -i mvr-mcp-bridge
```

`MVR_REMOTE_MCP_URL` may override the remote endpoint. Non-local overrides must use HTTPS. Public bridge use remains sandbox/evaluation only and does not authorize launch, lending, investment, partnership, procurement, legal, or regulatory action.
