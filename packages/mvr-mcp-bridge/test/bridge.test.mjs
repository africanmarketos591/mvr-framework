import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const bridgeEntry = path.resolve(here, "../src/index.mjs");

async function startMockRemote() {
  const observed = [];
  const server = http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const envelope = JSON.parse(raw);
    observed.push({ method: envelope.method, params: envelope.params, authorization: request.headers.authorization || null });

    const result = envelope.method === "tools/list"
      ? {
          tools: [{
            name: "mvr_first_call",
            description: "Use this when an African market decision needs evidence-first preflight.",
            inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
            annotations: { readOnlyHint: true }
          }]
        }
      : {
          content: [{ type: "text", text: "activation_ready" }],
          structuredContent: { activation_ready: true, not_a_verdict: true }
        };

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ jsonrpc: "2.0", id: envelope.id, result }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/mcp/preflight`,
    observed,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

test("stdio bridge discovers and calls the remote five-tool profile without forwarding credentials", async () => {
  const remote = await startMockRemote();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [bridgeEntry],
    env: { ...process.env, MVR_REMOTE_MCP_URL: remote.url }
  });
  const client = new Client({ name: "mvr-bridge-test", version: "1.0.0" }, { capabilities: {} });

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map((tool) => tool.name), ["mvr_first_call"]);
    assert.equal(listed.tools[0].annotations.readOnlyHint, true);

    const called = await client.callTool({ name: "mvr_first_call", arguments: { question: "Should a fictional fintech launch in Uganda?" } });
    assert.equal(called.structuredContent.activation_ready, true);
    assert.equal(called.structuredContent.not_a_verdict, true);
    assert.deepEqual(remote.observed.map((item) => item.method), ["tools/list", "tools/call"]);
    assert(remote.observed.every((item) => item.authorization === null));
  } finally {
    await transport.close();
    await remote.close();
  }
});
