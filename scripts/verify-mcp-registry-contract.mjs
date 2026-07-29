import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const fail = (message) => {
  throw new Error(message);
};

const endpoint = "https://africanmarketos.com/mcp/preflight";
const registryUrl = "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.africanmarketos591%2Fmvr-api";
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

const expectedProtocols = ["2026-07-28", "2025-11-25", "2025-06-18"];
const publisher = server._meta?.["io.modelcontextprotocol.registry/publisher-provided"] || {};
if (JSON.stringify(publisher.mcpProtocolVersions) !== JSON.stringify(expectedProtocols)) fail("server.json supported protocol list drift");
if (publisher.commercialRoute !== "https://africanmarketos.com/checkout/starter") fail("server.json must route standard paid activation to Starter checkout");
if (publisher.governedAccessRoute !== "https://africanmarketos.com/get-api-key") fail("server.json governed-access route drift");
if (JSON.stringify(manifest.version_contract?.mcp_protocol_versions) !== JSON.stringify(expectedProtocols)) fail("mcp/manifest.json supported protocol list drift");
if (manifest.commercial_next_step?.starter_checkout !== "https://africanmarketos.com/checkout/starter") fail("mcp/manifest.json Starter checkout drift");
if (manifest.commercial_next_step?.governed_access_url !== "https://africanmarketos.com/get-api-key") fail("mcp/manifest.json governed route drift");

for (const file of clientFiles) {
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.includes(endpoint)) fail(`${file} does not use the preflight endpoint`);
  if (raw.includes("X-API-Key") || raw.includes("mvr-demo-key-2026")) fail(`${file} incorrectly adds REST sandbox credentials to the keyless MCP profile`);
  readJson(file);
}

const readme = fs.readFileSync("mcp/README.md", "utf8");
for (const name of expectedTools) if (!readme.includes(name)) fail(`MCP README omits ${name}`);
if (readme.replace(/\s/g, "").includes('"name":"mvr_preflight_market_entry"')) fail("MCP README calls a host-side wrapper as a production tool");

async function callMcp(body, protocolVersion = null) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "user-agent": "mvr-registry-contract-ci/1.0",
  };
  if (protocolVersion) headers["MCP-Protocol-Version"] = protocolVersion;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
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
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "mvr-registry-contract-ci", version: "1.0.0" },
  },
});
if (initialized.result?.protocolVersion !== "2025-11-25") fail("Live initialize protocol mismatch");

const listed = await callMcp({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, "2025-11-25");
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
}, "2025-11-25");
let result = firstCall.result?.structuredContent;
if (!result && firstCall.result?.content?.[0]?.text) result = JSON.parse(firstCall.result.content[0].text);
if (result?.not_a_verdict !== true || result?.live_mvr_scoring_executed !== false) fail("First-call safety boundary drift");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchLatestRegistryRecord() {
  const attempts = process.env.MVR_REQUIRE_REGISTRY_PUBLISHED === "1" ? 6 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(registryUrl, { headers: { accept: "application/json", "user-agent": "mvr-registry-contract-ci/1.0" } });
    if (!response.ok) fail(`Official MCP Registry lookup failed with HTTP ${response.status}`);
    const payload = await response.json();
    const records = Array.isArray(payload.servers) ? payload.servers : [];
    const latest = records.find((item) => item?._meta?.["io.modelcontextprotocol.registry/official"]?.isLatest === true);
    if (latest?.server?.version === server.version || attempt === attempts) return latest;
    await sleep(10000);
  }
  return null;
}

const registryRecord = await fetchLatestRegistryRecord();
if (!registryRecord?.server) fail("Official MCP Registry did not return an active latest record");
const official = registryRecord.server;
const strictRegistry = process.env.MVR_REQUIRE_REGISTRY_PUBLISHED === "1";
let registryStatus = "published_aligned";
if (official.version !== server.version) {
  const parseVersion = (value) => String(value).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [localMajor, localMinor, localPatch] = parseVersion(server.version);
  const [remoteMajor, remoteMinor, remotePatch] = parseVersion(official.version);
  const localIsNewer = localMajor > remoteMajor || (localMajor === remoteMajor && (localMinor > remoteMinor || (localMinor === remoteMinor && localPatch > remotePatch)));
  if (strictRegistry || !localIsNewer) fail(`Official MCP Registry latest is ${official.version}; local manifest is ${server.version}`);
  registryStatus = "local_metadata_revision_pending_publication";
} else {
  const officialPublisher = official._meta?.["io.modelcontextprotocol.registry/publisher-provided"] || {};
  if (official.remotes?.[0]?.url !== endpoint) fail("Official MCP Registry endpoint drift");
  if (officialPublisher.commercialRoute !== "https://africanmarketos.com/checkout/starter") fail("Official MCP Registry commercial route drift");
  if (officialPublisher.governedAccessRoute !== "https://africanmarketos.com/get-api-key") fail("Official MCP Registry governed route drift");
  if (JSON.stringify(officialPublisher.sdkPackages) !== JSON.stringify(publisher.sdkPackages)) fail("Official MCP Registry SDK package metadata drift");
  if (JSON.stringify(officialPublisher.mcpProtocolVersions) !== JSON.stringify(expectedProtocols)) fail("Official MCP Registry protocol support metadata drift");
}

console.log(JSON.stringify({ status: "ok", registry_status: registryStatus, local_registry_revision: server.version, published_registry_revision: official.version, endpoint, tool_count: liveTools.length, not_a_verdict: true }));
