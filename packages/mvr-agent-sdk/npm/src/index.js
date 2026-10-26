import { createHash } from "node:crypto";

export const MVR_AGENT_SDK_VERSION = "0.2.0";

export class MvrPreflightClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || "https://africanmarketos.com").replace(/\/+$/, "");
    this.apiKey = options.apiKey || process.env.MVR_API_KEY || "mvr-demo-key-2026";
    this.responseProfile = options.responseProfile || "full_advisory";
    this.fetchImpl = options.fetch || globalThis.fetch;
    if (!this.fetchImpl) throw new Error("fetch is required. Use Node 18+ or pass options.fetch.");
    // Every request has a deadline; expectedRevision pins one deployment (the server refuses a mismatch with 409).
    this.timeoutMs = options.timeoutMs ?? 30000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 600000) throw new RangeError("timeoutMs must be between 1 and 600000");
    this.expectedRevision = options.expectedRevision ?? null;
    if (this.expectedRevision !== null && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(this.expectedRevision)) throw new TypeError("expectedRevision must be a deployment identifier");
    this.userAgent = options.userAgent ?? "mvr-agent-sdk-js/" + MVR_AGENT_SDK_VERSION;
    this.lastDeploymentRevision = null;
  }

  async request(path, { method = "POST", body, idempotencyKey, timeoutMs = this.timeoutMs, signal } = {}) {
    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      "X-Response-Profile": this.responseProfile,
      "X-MVR-SDK": "mvr-agent-sdk-js/" + MVR_AGENT_SDK_VERSION
    };
    if (typeof window === "undefined" && this.userAgent) headers["User-Agent"] = this.userAgent;
    if (this.expectedRevision) headers["X-MVR-Expected-Deployment-Revision"] = this.expectedRevision;
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const deadline = AbortSignal.timeout(timeoutMs);
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    this.lastDeploymentRevision = res.headers?.get?.("X-MVR-Deployment-Revision") ?? null;
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; }
    catch { json = { status: "invalid_json_response", raw: text }; }
    if (!res.ok) {
      const err = new Error(json.error?.message || json.error || `MVR API request failed: ${res.status}`);
      err.status = res.status;
      err.code = json.code || null;
      err.response = json;
      err.deploymentRevision = this.lastDeploymentRevision;
      throw err;
    }
    return json;
  }

  authCheck() {
    return this.request("/v1/auth-check", { body: {} });
  }

  entityResolve(payload) {
    return this.request("/v1/entity-resolve", { body: payload });
  }

  evidenceCompleteness(payload) {
    return this.request("/v1/evidence-completeness", { body: payload });
  }

  contextCompile(payload) {
    return this.request("/v1/context/compile", { body: payload });
  }

  decisionCheck(payload, idempotencyKey = null) {
    const key = idempotencyKey || deterministicIdempotencyKey(payload);
    return this.request("/v1/decision-check", { body: payload, idempotencyKey: key });
  }

  async preflightMarketEntry(payload) {
    const subject = payload.subject || {
      entity_name: payload.company_name || payload.entity_name || "Unknown subject",
      entity_archetype: payload.entity_archetype || payload.archetype || payload.sector || "general_venture",
      sector: payload.sector
    };
    const market_scope = payload.market_scope || {
      country: payload.country,
      city: payload.city,
      region: payload.region
    };
    const evidence_pack = payload.evidence_pack || [];

    const entity = await this.entityResolve({ ...payload, subject, market_scope });
    const completenessPayload = { ...payload, subject, market_scope, evidence_pack };
    const completeness = await this.evidenceCompleteness(completenessPayload);
    const hasEnoughEvidence = completeness.decision_ready === true || completeness.status === "decision_ready";
    if (!hasEnoughEvidence && evidence_pack.length === 0) {
      return {
        status: "abstained",
        reason: "evidence_required_before_decision_check",
        entity,
        evidence_completeness: completeness,
        recommended_next_step: "Collect provenance-backed local evidence, then call /v1/decision-check.",
        mvr_api_called_for_final_verdict: false
      };
    }
    const decisionPayload = {
      mode: evidence_pack.length ? "evidence_backed" : "exploratory",
      case_type: payload.case_type || "market_entry",
      subject,
      market_scope,
      stakeholder_scope: payload.stakeholder_scope,
      evidence_pack
    };
    const decision = await this.decisionCheck(decisionPayload);
    return { status: "ok", entity, evidence_completeness: completeness, decision };
  }
}

export function deterministicIdempotencyKey(payload) {
  const raw = stableStringify(payload || {});
  return `mvr-js-${createHash("sha256").update(raw).digest("hex").slice(0, 64)}`;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
