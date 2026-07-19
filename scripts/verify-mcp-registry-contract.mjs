import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const fail = (message) => {
  throw new Error(message);
};

const endpoint = "https://africanmarketos.com/mcp/preflight";
const expectedTools = [
  "mvr_first_call",
  "mvr_entity_resolve",
  "mvr_evidence_completeness",
  "mvr_context_compile",
  "mvr_decision_check",
];

const server = readJson("server.json");
const manifest = readJson("mcp/manifest.json");
const agents = readJson("agents.json");
const clientFiles = [
  "mcp/claude-desktop.json",
  "mcp/continue.json",
  "mcp/cursor.json",
  "mcp/windsurf.json",
];

if (server.remotes?.[0]?.url !== endpoint) fail("server.json must publish the read-only preflight endpoint");
if (typeof server.description !== "string" || server.description.length > 100) fail("server.json description must satisfy the MCP Registry 100-character limit");
if (manifest.transport?.url !== endpoint || manifest.install?.remote_mcp !== endpoint) fail("mcp/manifest.json endpoint drift");
if (manifest.tool_profile?.tool_count !== 5 || manifest.tool_profile?.write_tools_exposed !== false) fail("MCP manifest must expose five read-only tools");
if (manifest.version !== `v${server.version}`) fail("server.json and mcp/manifest.json revisions differ");
if (agents.mcp?.endpoint !== endpoint || agents.version_info?.registry_manifest_revision !== server.version) fail("agents.json registry contract drift");
if (agents.version_info?.runtime_version !== "MVR Core API v6.32.0") fail("MCP metadata update must not change the core API version");

for (const file of clientFiles) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.includes(endpoint)) fail(`${file} does not use the preflight endpoint`);
  if (raw.includes("X-API-Key") || raw.includes("mvr-demo-key-2026")) fail(`${file} incorrectly adds REST sandbox credentials to the keyless MCP profile`);
  readJson(file);
}

const readme = fs.readFileSync("mcp/README.md", "utf8");
for (const name of expectedTools) if (!readme.includes(name)) fail(`MCP README omits ${name}`);
if (readme.replace(/\s/g, "").includes('"name":"mvr_preflight_market_entry"')) fail("MCP README calls a host-side wrapper as a production tool");

async function callMcp(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "user-agent": "mvr-registry-contract-ci/1.0",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) fail(`Live MCP call failed with HTTP ${response.status}`);
  return response.json();
}

const initialized = await callMcp({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "mvr-registry-contract-ci", version: "1.0.0" },
  },
});
if (initialized.result?.protocolVersion !== "2025-06-18") fail("Live initialize protocol mismatch");

const listed = await callMcp({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
const liveTools = (listed.result?.tools || []).map((tool) => tool.name);
if (JSON.stringify(liveTools) !== JSON.stringify(expectedTools)) fail(`Live tool profile drift: ${liveTools.join(", ")}`);

const firstCall = await callMcp({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    name: "mvr_first_call",
    arguments: {
      company_name: "Registry contract canary",
      country: "UG",
      sector: "supplier finance",
      question: "Should this product proceed beyond bounded discovery?",
    },
  },
});
let result = firstCall.result?.structuredContent;
if (!result && firstCall.result?.content?.[0]?.text) result = JSON.parse(firstCall.result.content[0].text);
if (result?.not_a_verdict !== true || result?.live_mvr_scoring_executed !== false) fail("First-call safety boundary drift");

console.log(JSON.stringify({ status: "ok", registry_version: server.version, endpoint, tool_count: liveTools.length, not_a_verdict: true }));
