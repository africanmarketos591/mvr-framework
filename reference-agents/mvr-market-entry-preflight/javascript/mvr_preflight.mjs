#!/usr/bin/env node
import fs from "node:fs";

const DEFAULT_ENDPOINT = "https://africanmarketos.com/mcp/preflight";
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

export function validateMcpEnvelope(envelope, requestId, method) {
  const prefix = `MCP protocol error for ${method}`;
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new Error(`${prefix}: response envelope must be a JSON object`);
  if (envelope.jsonrpc !== "2.0") throw new Error(`${prefix}: jsonrpc must equal 2.0`);
  if (envelope.id !== requestId) throw new Error(`${prefix}: response id does not match request id ${requestId}`);
  if (envelope.error !== undefined && envelope.error !== null) throw new Error(`MCP error for ${method}: ${JSON.stringify(envelope.error)}`);
  if (!Object.prototype.hasOwnProperty.call(envelope, "result")) throw new Error(`${prefix}: response has neither result nor error`);
  if (!envelope.result || typeof envelope.result !== "object" || Array.isArray(envelope.result)) throw new Error(`${prefix}: result must be a JSON object`);
  return envelope.result;
}

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

export function buildInitialCall(requestData = {}) {
  const subject = requestData.subject && typeof requestData.subject === "object" ? requestData.subject : {};
  const marketScope = requestData.market_scope && typeof requestData.market_scope === "object" ? requestData.market_scope : {};
  const question = String(requestData.question || "").trim();
  const country = String(requestData.country || marketScope.country || "").trim();
  const sector = String(requestData.sector || subject.sector || "").trim();
  return compact({
    question,
    use_case: requestData.use_case,
    target_claim: requestData.target_claim || question,
    entity: subject.entity_name || requestData.entity,
    company_name: requestData.company_name,
    entity_archetype: subject.entity_archetype,
    sector,
    stage: requestData.stage || requestData.decision_stage,
    target_users: requestData.target_users,
    country: marketScope.country || country,
    market_scope: Object.keys(marketScope).length ? marketScope : country ? { country } : undefined,
    evidence_available: requestData.evidence_available,
    evidence_pack: requestData.evidence_pack,
    evidence_items: requestData.evidence_items,
    known_partners: requestData.known_partners
  });
}

export function extractToolPayload(result = {}) {
  if (result.structuredContent && typeof result.structuredContent === "object" && !Array.isArray(result.structuredContent)) return result.structuredContent;
  for (const item of Array.isArray(result.content) ? result.content : []) {
    if (item?.type !== "text" || typeof item.text !== "string") continue;
    try {
      const parsed = JSON.parse(item.text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Continue to the next content item; structuredContent remains authoritative when present.
    }
  }
  return result;
}

export function normalizeNextCall(result = {}, completedSequence = []) {
  const disposition = String(result.continuation_disposition || (result.mcp_next_call || result.mcp_next_tool ? "call_now" : "terminal"));
  const canonical = result.mcp_next_call;
  const legacy = result.mcp_next_tool?.tool_name
    ? { name: result.mcp_next_tool.tool_name, arguments: result.mcp_next_tool.arguments || {} }
    : null;
  if (canonical && legacy && (canonical.name !== legacy.name || JSON.stringify(canonical.arguments || {}) !== JSON.stringify(legacy.arguments || {}))) {
    throw new Error("MCP handoff mismatch between mcp_next_call and legacy mcp_next_tool");
  }
  const nextCall = canonical || legacy;
  if (disposition === "await_input" || disposition === "terminal") {
    if (nextCall) throw new Error(`MCP handoff must be null when continuation_disposition=${disposition}`);
    return null;
  }
  if (disposition !== "call_now") throw new Error(`Unsupported continuation_disposition: ${disposition}`);
  if (!nextCall || typeof nextCall !== "object" || Array.isArray(nextCall)) throw new Error("MCP call_now result is missing mcp_next_call");
  if (typeof nextCall.name !== "string" || !nextCall.name) throw new Error("MCP next call is missing a tool name");
  if (!nextCall.arguments || typeof nextCall.arguments !== "object" || Array.isArray(nextCall.arguments)) throw new Error("MCP next call arguments must be an object");
  const expected = CANONICAL_SEQUENCE[completedSequence.length];
  if (nextCall.name !== expected) throw new Error(`MCP server returned ${nextCall.name}; expected ${expected || "no further tool"}`);
  if (completedSequence.includes(nextCall.name)) throw new Error(`MCP handoff cycle detected at ${nextCall.name}`);
  const resultWorkflow = String(result.workflow_id || "");
  const handoffWorkflow = String(nextCall.arguments?.payload?.workflow_id || "");
  if (resultWorkflow && handoffWorkflow && resultWorkflow !== handoffWorkflow) throw new Error("MCP handoff workflow_id does not match the current result");
  return nextCall;
}

class McpClient {
  constructor(endpoint) {
    if (!endpoint.startsWith("https://")) throw new Error("MVR_MCP_URL must use HTTPS");
    this.endpoint = endpoint;
    this.id = 1;
    this.protocolVersion = null;
  }

  async rpc(method, params) {
    const requestId = this.id++;
    const headers = { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "mvr-reference-preflight-javascript/1.0" };
    if (this.protocolVersion && method !== "initialize") headers["MCP-Protocol-Version"] = this.protocolVersion;
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, ...(params === undefined ? {} : { params }) })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 500)}`);
    let envelope;
    try {
      envelope = JSON.parse(text);
    } catch {
      throw new Error(`MCP protocol error for ${method}: response is not valid JSON`);
    }
    const result = validateMcpEnvelope(envelope, requestId, method);
    if (method === "initialize" && typeof result.protocolVersion === "string") this.protocolVersion = result.protocolVersion;
    return result;
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
  await client.rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "mvr-reference-preflight-javascript", version: "1.0" } });
  const tools = (await client.rpc("tools/list")).tools || [];
  const names = new Set(tools.map((tool) => String(tool.name)));
  const missing = CANONICAL_SEQUENCE.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`MCP server is missing canonical tools: ${missing.join(", ")}`);

  const sequence = [];
  const results = {};
  let nextCall = { name: "mvr_first_call", arguments: buildInitialCall(requestData) };
  let final = null;
  for (let step = 0; step < CANONICAL_SEQUENCE.length && nextCall; step += 1) {
    const expected = CANONICAL_SEQUENCE[sequence.length];
    if (nextCall.name !== expected) throw new Error(`MCP client refused out-of-order call ${nextCall.name}; expected ${expected}`);
    const rpcResult = await client.rpc("tools/call", nextCall);
    final = extractToolPayload(rpcResult);
    sequence.push(nextCall.name);
    results[nextCall.name] = final;
    nextCall = normalizeNextCall(final, sequence);
  }
  if (nextCall) throw new Error("MCP handoff exceeded the bounded five-tool sequence");
  const continuationDisposition = String(final?.continuation_disposition || "terminal");
  const complete = sequence.at(-1) === "mvr_decision_check" && continuationDisposition === "terminal";
  const requiredGate = complete ? "preflight_completed_but_public_sandbox_not_authorizing" : "blocked_pending_evidence";
  return {
    status: complete ? "full_preflight_completed" : "evidence_requested",
    policy_mode: policyMode,
    policy_classification: policyClassification,
    policy_gate: policyMode === "required_preflight" ? requiredGate : "advisory_only",
    recommendation_release_allowed: false,
    environment: "public_sandbox",
    sequence,
    continuation_disposition: continuationDisposition,
    workflow_status: final?.workflow_status || null,
    not_a_verdict: final?.not_a_verdict ?? true,
    result: final,
    boundary: "Public sandbox output is advisory routing, not a production verdict, approval, certification, legal opinion, underwriting decision, or autonomous authorization."
  };
}

function selfTest() {
  const initial = buildInitialCall({
    question: "Should we enter Kenya?",
    country: "KE",
    subject: { entity_name: "Example", entity_archetype: "distributor_network" },
    market_scope: { country: "KE" },
    evidence_pack: [{ id: "EV-1", verification_status: "verified" }]
  });
  if (initial.entity !== "Example" || initial.country !== "KE" || initial.evidence_pack?.[0]?.id !== "EV-1") throw new Error("initial call did not preserve supplied context and evidence");
  const canonicalHandoff = normalizeNextCall({
    continuation_disposition: "call_now",
    workflow_id: "MVRWF-test",
    mcp_next_call: { name: "mvr_entity_resolve", arguments: { payload: { workflow_id: "MVRWF-test" } } }
  }, ["mvr_first_call"]);
  if (canonicalHandoff.name !== "mvr_entity_resolve") throw new Error("canonical handoff mismatch");
  const legacyHandoff = normalizeNextCall({ continuation_disposition: "call_now", mcp_next_tool: { tool_name: "mvr_entity_resolve", arguments: { payload: {} } } }, ["mvr_first_call"]);
  if (legacyHandoff.name !== "mvr_entity_resolve") throw new Error("legacy handoff mismatch");
  if (normalizeNextCall({ continuation_disposition: "await_input", mcp_next_call: null }, ["mvr_first_call"]) !== null) throw new Error("await_input must stop the client");
  const contentOnly = extractToolPayload({ content: [{ type: "text", text: JSON.stringify({ status: "ok", continuation_disposition: "terminal" }) }] });
  if (contentOnly.status !== "ok") throw new Error("content-only result extraction mismatch");
  try {
    normalizeNextCall({ continuation_disposition: "call_now", mcp_next_call: { name: "mvr_decision_check", arguments: { payload: {} } } }, ["mvr_first_call"]);
    throw new Error("out-of-order handoff was accepted");
  } catch (error) {
    if (!error.message.includes("expected mvr_entity_resolve")) throw error;
  }
  if (classifyPolicyIntent({ question: "Should this fintech launch lending in Uganda?", country: "UG" }) !== "protected") throw new Error("protected policy classification mismatch");
  if (classifyPolicyIntent({ question: "Translate this paragraph into Luganda." }) !== "not_protected") throw new Error("no-call policy classification mismatch");
  if (classifyPolicyIntent({ question: "Should we launch this?" }) !== "ambiguous") throw new Error("ambiguous policy classification mismatch");
  const valid = validateMcpEnvelope({ jsonrpc: "2.0", id: 7, result: { tools: [] } }, 7, "tools/list");
  if (!Array.isArray(valid.tools)) throw new Error("valid envelope mismatch");
  const invalidEnvelopes = [
    [[], "response envelope"],
    [{ jsonrpc: "1.0", id: 7, result: {} }, "jsonrpc"],
    [{ jsonrpc: "2.0", id: 8, result: {} }, "response id"],
    [{ jsonrpc: "2.0", id: 7 }, "neither result nor error"],
    [{ jsonrpc: "2.0", id: 7, result: [] }, "result must be"],
    [{ jsonrpc: "2.0", id: 7, error: { code: -32603, message: "test" } }, "MCP error"]
  ];
  for (const [envelope, expected] of invalidEnvelopes) {
    try {
      validateMcpEnvelope(envelope, 7, "tools/list");
      throw new Error(`malformed MCP envelope was accepted: ${JSON.stringify(envelope)}`);
    } catch (error) {
      if (!error.message.includes(expected)) throw error;
    }
  }
  process.stdout.write(`${JSON.stringify({ self_test: "PASS", canonical_sequence_bound: CANONICAL_SEQUENCE.length, replayable_handoff: true, content_only_fallback: true, policy_modes: POLICY_MODES, malformed_envelopes_rejected: invalidEnvelopes.length })}\n`);
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
