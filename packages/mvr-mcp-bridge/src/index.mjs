import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_REMOTE_URL = "https://africanmarketos.com/mcp/preflight";
const BRIDGE_VERSION = "0.1.0";
const MAX_REMOTE_RESPONSE_BYTES = 2 * 1024 * 1024;

function validateRemoteUrl(value) {
  const url = new URL(value || DEFAULT_REMOTE_URL);
  const localDevelopment = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("MVR_REMOTE_MCP_URL must use HTTPS unless it targets localhost.");
  }
  return url.toString();
}

function parseRemoteEnvelope(text, contentType = "") {
  if (/text\/event-stream/i.test(contentType)) {
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      return JSON.parse(data);
    }
    throw new Error("The remote MCP server returned an empty event stream.");
  }
  return JSON.parse(text);
}

export async function remoteMcpCall(method, params = {}, options = {}) {
  const remoteUrl = validateRemoteUrl(options.remoteUrl || process.env.MVR_REMOTE_MCP_URL || DEFAULT_REMOTE_URL);
  const timeoutMs = Number(options.timeoutMs || process.env.MVR_REMOTE_TIMEOUT_MS || 30_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(remoteUrl, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": `mvr-mcp-bridge/${BRIDGE_VERSION}`
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method,
        params
      }),
      signal: controller.signal
    });

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_REMOTE_RESPONSE_BYTES) {
      throw new Error("The remote MCP response exceeded the bridge size limit.");
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_REMOTE_RESPONSE_BYTES) {
      throw new Error("The remote MCP response exceeded the bridge size limit.");
    }

    let envelope;
    try {
      envelope = parseRemoteEnvelope(text, response.headers.get("content-type") || "");
    } catch {
      throw new Error(`The remote MCP server returned an invalid response (HTTP ${response.status}).`);
    }

    if (!response.ok || envelope?.error) {
      const code = envelope?.error?.code ?? response.status;
      const message = envelope?.error?.message || `Remote MCP request failed with HTTP ${response.status}.`;
      throw new Error(`Remote MCP error ${code}: ${message}`);
    }

    if (!envelope || typeof envelope !== "object" || !("result" in envelope)) {
      throw new Error("The remote MCP response did not contain a JSON-RPC result.");
    }

    return envelope.result;
  } finally {
    clearTimeout(timer);
  }
}

export function createBridgeServer(options = {}) {
  const remoteUrl = validateRemoteUrl(options.remoteUrl || process.env.MVR_REMOTE_MCP_URL || DEFAULT_REMOTE_URL);
  const server = new Server(
    { name: "african-market-os-mvr-bridge", version: BRIDGE_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async (request) =>
    remoteMcpCall("tools/list", request.params || {}, { remoteUrl })
  );

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    remoteMcpCall("tools/call", request.params || {}, { remoteUrl })
  );

  return server;
}

export async function main() {
  const server = createBridgeServer();
  await server.connect(new StdioServerTransport());
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`MVR MCP bridge failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
