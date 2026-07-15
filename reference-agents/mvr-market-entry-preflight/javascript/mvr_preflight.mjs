#!/usr/bin/env node
import fs from "node:fs";

const DEFAULT_ENDPOINT = "https://africanmarketos.com/mcp";
const CANONICAL_SEQUENCE = [
  "mvr_first_call",
  "mvr_entity_resolve",
  "mvr_evidence_completeness",
  "mvr_context_compile",
  "mvr_decision_check"
];
const POLICY_MODES = ["advisory_selection", "required_preflight"];
const AFRICAN_COUNTRY_CODES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", "CI", "DJ",
  "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG",
  "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO",
  "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW"
]);
const PROTECTED_ACTION_RE = /\b(enter|entry|launch|pilot|scale|expand|expansion|invest|fund|partner|partnership|procure|procurement|deploy|rollout|lend|lending|loan|credit|bnpl|underwrite|market[- ]entry)\b/i;
const MARKET_CONTEXT_RE = /\b(africa|african|emerging market|high[- ]context market)\b/i;
const PURE_TASK_RE = /\b(debug|refactor|unit test|css|html|sql query|translate|weather|football|summari[sz]e)\b/i;

export function classifyPolicyIntent(requestData = {}) {
  const marketScope = requestData.market_scope && typeof requestData.market_scope === "object" ? requestData.market_scope : {};
  const country = String(requestData.country || marketScope.country || "").trim().toUpperCase();
  const text = ["question", "target_claim", "sector", "use_case", "intent"].map((key) => String(requestData[key] || "")).join(" ");
  const protectedAction = PROTECTED_ACTION_RE.test(text);
  const marketContext = AFRICAN_COUNTRY_CODES.has(country) || requestData.high_context_market === true || MARKET_CONTEXT_RE.test(text);
  const pureTask = PURE_TASK_RE.test(text) && !protectedAction;
  if (pureTask || (!protectedAction && !marketContext)) return "not_protected";
  if (protectedAction && marketContext) return "protected";
  return "ambiguous";
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== "" && !(typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)));
}

export function buildSequence(requestData = {}) {
  const subject = requestData.subject && typeof requestData.subject === "object" ? requestData.subject : {};
  const marketScope = requestData.market_scope && typeof requestData.market_scope === "object" ? requestData.market_scope : {};
  const question = String(requestData.question || "").trim();
  const country = String(requestData.country || marketScope.country || "").trim();
  const sector = String(requestData.sector || subject.sector || "").trim();
  const calls = [["mvr_first_call", compact({ question, entity: subject.entity_name || requestData.entity, country, sector })]];
  if (!Array.isArray(requestData.evidence_pack) || requestData.evidence_pack.length === 0) return calls;

  const payload = compact({
    subject,
    market_scope: Object.keys(marketScope).length ? marketScope : country ? { country } : {},
    decision_stage: requestData.decision_stage,
    target_claim: requestData.target_claim || question,
    evidence_pack: requestData.evidence_pack
  });
  const entityPayload = compact({
    entity_name: subject.entity_name || requestData.entity,
    entity_archetype: subject.entity_archetype,
    sector: subject.sector || sector,
    country: marketScope.country || country,
    market_scope: Object.keys(marketScope).length ? marketScope : undefined
  });
  calls.push(
    ["mvr_entity_resolve", { payload: entityPayload }],
    ["mvr_evidence_completeness", { payload }],
    ["mvr_context_compile", { payload }],
    ["mvr_decision_check", { payload }]
  );
  return calls;
}

class McpClient {
  constructor(endpoint) {
    if (!endpoint.startsWith("https://")) throw new Error("MVR_MCP_URL must use HTTPS");
    this.endpoint = endpoint;
    this.id = 1;
  }

  async rpc(method, params) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mvr-reference-preflight-javascript/1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: this.id++, method, ...(params === undefined ? {} : { params }) })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 500)}`);
    const envelope = JSON.parse(text);
    if (envelope.error) throw new Error(`MCP error: ${JSON.stringify(envelope.error)}`);
    return envelope.result || {};
  }
}

async function execute(requestData, endpoint, policyMode = "advisory_selection") {
  if (!POLICY_MODES.includes(policyMode)) throw new Error(`Unsupported policy mode: ${policyMode}`);
  const policyClassification = classifyPolicyIntent(requestData);
  if (policyMode === "required_preflight" && policyClassification === "not_protected") {
    return {
      status: "policy_not_applicable",
      policy_mode: policyMode,
      policy_classification: policyClassification,
      mvr_preflight_required: false,
      recommendation_release_authority: "host_policy_only"
    };
  }
  if (policyMode === "required_preflight" && policyClassification === "ambiguous") {
    return {
      status: "policy_review_required",
      policy_mode: policyMode,
      policy_classification: policyClassification,
      mvr_preflight_required: "undetermined",
      recommendation_release_allowed: false,
      reason: "The request may be consequential, but the market or protected action is not explicit enough for automatic release."
    };
  }
  const client = new McpClient(endpoint);
  await client.rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "mvr-reference-preflight-javascript", version: "1.0" } });
  const tools = (await client.rpc("tools/list")).tools || [];
  const names = new Set(tools.map((tool) => String(tool.name)));
  const missing = CANONICAL_SEQUENCE.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`MCP server is missing canonical tools: ${missing.join(", ")}`);

  const sequence = buildSequence(requestData);
  const results = {};
  for (const [name, argumentsValue] of sequence) {
    const result = await client.rpc("tools/call", { name, arguments: argumentsValue });
    results[name] = result.structuredContent || result;
  }
  const complete = sequence.length === CANONICAL_SEQUENCE.length;
  const final = results[sequence.at(-1)[0]];
  const requiredGate = complete ? "preflight_completed_but_public_sandbox_not_authorizing" : "blocked_pending_evidence";
  return {
    status: complete ? "full_preflight_completed" : "evidence_requested",
    policy_mode: policyMode,
    policy_classification: policyClassification,
    policy_gate: policyMode === "required_preflight" ? requiredGate : "advisory_only",
    recommendation_release_allowed: false,
    environment: "public_sandbox",
    sequence: sequence.map(([name]) => name),
    not_a_verdict: final.not_a_verdict ?? true,
    result: final,
    boundary: "Public sandbox output is advisory routing, not a production verdict, approval, certification, legal opinion, underwriting decision, or autonomous authorization."
  };
}

function selfTest() {
  const short = buildSequence({ question: "Should we enter Kenya?", country: "KE" });
  if (short.map(([name]) => name).join(",") !== "mvr_first_call") throw new Error("short sequence mismatch");
  const full = buildSequence({
    question: "Should we enter Kenya?",
    country: "KE",
    subject: { entity_name: "Example", entity_archetype: "distributor_network" },
    market_scope: { country: "KE" },
    evidence_pack: [{ id: "EV-1", verification_status: "verified" }]
  });
  if (full.map(([name]) => name).join(",") !== CANONICAL_SEQUENCE.join(",")) throw new Error("full sequence mismatch");
  if (classifyPolicyIntent({ question: "Should this fintech launch lending in Uganda?", country: "UG" }) !== "protected") throw new Error("protected policy classification mismatch");
  if (classifyPolicyIntent({ question: "Translate this paragraph into Luganda." }) !== "not_protected") throw new Error("no-call policy classification mismatch");
  if (classifyPolicyIntent({ question: "Should we launch this?" }) !== "ambiguous") throw new Error("ambiguous policy classification mismatch");
  process.stdout.write(`${JSON.stringify({ self_test: "PASS", short_sequence: 1, full_sequence: full.length, policy_modes: POLICY_MODES })}\n`);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  selfTest();
} else {
  const inputIndex = args.indexOf("--input");
  if (inputIndex < 0 || !args[inputIndex + 1]) {
    process.stderr.write("ERROR: --input is required unless --self-test is used\n");
    process.exitCode = 2;
  } else {
    try {
      const requestData = JSON.parse(fs.readFileSync(args[inputIndex + 1], "utf8").replace(/^\uFEFF/, ""));
      const modeIndex = args.indexOf("--mode");
      const policyMode = modeIndex >= 0 && args[modeIndex + 1] ? args[modeIndex + 1] : "advisory_selection";
      const output = await execute(requestData, process.env.MVR_MCP_URL || DEFAULT_ENDPOINT, policyMode);
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`ERROR: ${error.message}\n`);
      process.exitCode = 2;
    }
  }
}
