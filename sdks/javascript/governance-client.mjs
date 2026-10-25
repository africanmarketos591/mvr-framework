// Generated from the AMOS OpenAPI contract (https://africanmarketos.com/v1/openapi.json) by scripts/generate-governance-client.mjs.
// Contract subset SHA-256: 58452d8727a538c5abd97488de396257ccbc378a29ececb8f81fd491bb1baec0. Do not edit by hand; regenerate instead.
// Every method returns {status, body} and never throws on a refusal, so the server's coded refusal reaches the caller intact.
export const GOVERNANCE_OPERATIONS = Object.freeze({
  "reviewCases": {
    "method": "POST",
    "path": "/v1/review-cases",
    "api_key": true,
    "summary": "Create scoped review cases and internal planning workflows; link statements and recheck artifacts. Explicit evaluation grants are isolated. No external-action or evidence-truth authority."
  },
  "reviewCasesContract": {
    "method": "GET",
    "path": "/v1/review-cases/contract",
    "api_key": false,
    "summary": "Discover the bounded review workflow, residual-risk taxonomy, current-state checks and input schema."
  },
  "reviewSandbox": {
    "method": "POST",
    "path": "/v1/review-sandbox",
    "api_key": false,
    "summary": "Issue or use short-lived isolated synthetic reviewer sessions. Never a production identity or credential."
  },
  "reviewSandboxContract": {
    "method": "GET",
    "path": "/v1/review-sandbox/contract",
    "api_key": false,
    "summary": "Discover isolated synthetic reviewer evaluation sessions."
  },
  "authorityChain": {
    "method": "POST",
    "path": "/v1/authority-chain",
    "api_key": true,
    "summary": "Institution-signed authority checked by AMOS: register keys, reviewer standing and source records; close one residual at a time; register institution capabilities; verify a capability for one exact ef"
  },
  "authorityChainContract": {
    "method": "GET",
    "path": "/v1/authority-chain/contract",
    "api_key": false,
    "summary": "Discover the authority chain: who signs what, trust tiers, closure and capability rules, receipts and revocation."
  },
  "authorityReceiptsVerify": {
    "method": "POST",
    "path": "/v1/authority-receipts/verify",
    "api_key": false,
    "summary": "Verify a complete authority receipt against the published registry. Lab keys require an explicit session and opt-in. No execution permission."
  },
  "reviewerAttestations": {
    "method": "POST",
    "path": "/v1/reviewer-attestations",
    "api_key": true,
    "summary": "Create, inspect or withdraw an account-linked, explicitly shared, case-bound reviewer assertion. Not source verification, scoring evidence or action permission. Creation is idempotent by operation_id,"
  },
  "reviewerAttestationsContract": {
    "method": "GET",
    "path": "/v1/reviewer-attestations/contract",
    "api_key": false,
    "summary": "Discover the lightweight reviewer assertion workflow, account requirements and non-authorizing boundaries."
  },
  "keyCeremony": {
    "method": "POST",
    "path": "/v1/key-ceremony",
    "api_key": false,
    "summary": "Made-in-Cloudflare receipt key ceremony: precheck, run once, confirm token deletion, or recover an interrupted run. The Cloudflare API token in the body is the authority; it is never stored. Grants no"
  },
  "keyCeremonyStatus": {
    "method": "GET",
    "path": "/v1/key-ceremony/status",
    "api_key": false,
    "summary": "Public state of the receipt key ceremony, the signed birth record and its verification, and the private key binding metadata (never the key)."
  },
  "keyCeremonyContract": {
    "method": "GET",
    "path": "/v1/key-ceremony/contract",
    "api_key": false,
    "summary": "How the made-in-Cloudflare receipt key ceremony works, its refusals and custody."
  }
});
export class GovernanceClient {
  constructor({baseUrl = 'https://africanmarketos.com', apiKey = null, fetch: fetchImpl = globalThis.fetch, responseProfile = 'full_advisory', headers = {}} = {}) {
    this.baseUrl = String(baseUrl).replace(/\/$/, ''); this.apiKey = apiKey; this.fetch = fetchImpl; this.responseProfile = responseProfile; this.headers = headers;
  }
  async call(name, body) {
    const op = GOVERNANCE_OPERATIONS[name]; if (!op) throw new Error('Unknown governance operation: ' + name);
    if (op.api_key && !this.apiKey) throw new Error(op.path + ' needs an API key');
    const response = await this.fetch(this.baseUrl + op.path, {method:op.method, redirect:'error', headers:{'Content-Type':'application/json', 'X-Response-Profile':this.responseProfile, ...(op.api_key ? {'X-API-Key':this.apiKey} : {}), ...this.headers}, ...(op.method === 'POST' ? {body:JSON.stringify(body ?? {})} : {})});
    let parsed = null; try { parsed = await response.json(); } catch { parsed = null; }
    return {status:response.status, body:parsed};
  }
  /** POST /v1/review-cases (API key) */
  reviewCases(body) { return this.call('reviewCases', body); }
  /** GET /v1/review-cases/contract */
  reviewCasesContract() { return this.call('reviewCasesContract'); }
  /** POST /v1/review-sandbox */
  reviewSandbox(body) { return this.call('reviewSandbox', body); }
  /** GET /v1/review-sandbox/contract */
  reviewSandboxContract() { return this.call('reviewSandboxContract'); }
  /** POST /v1/authority-chain (API key) */
  authorityChain(body) { return this.call('authorityChain', body); }
  /** GET /v1/authority-chain/contract */
  authorityChainContract() { return this.call('authorityChainContract'); }
  /** POST /v1/authority-receipts/verify */
  authorityReceiptsVerify(body) { return this.call('authorityReceiptsVerify', body); }
  /** POST /v1/reviewer-attestations (API key) */
  reviewerAttestations(body) { return this.call('reviewerAttestations', body); }
  /** GET /v1/reviewer-attestations/contract */
  reviewerAttestationsContract() { return this.call('reviewerAttestationsContract'); }
  /** POST /v1/key-ceremony */
  keyCeremony(body) { return this.call('keyCeremony', body); }
  /** GET /v1/key-ceremony/status */
  keyCeremonyStatus() { return this.call('keyCeremonyStatus'); }
  /** GET /v1/key-ceremony/contract */
  keyCeremonyContract() { return this.call('keyCeremonyContract'); }
}
