// Generated from the AMOS OpenAPI contract by scripts/generate-governance-client.mjs (https://github.com/africanmarketos591/mvr-framework).
// Contract version v6.32.0; operation subset SHA-256: 568c81efaf61f1773791b31c90ece3893149121748c2994c63ad452d565c8621. Do not edit by hand; regenerate instead.
// Every method returns {status, body, deployment_revision} and never throws on a coded refusal. Network failures and
// timeouts throw. expectedRevision pins the deployment: the server refuses a mismatch with 409 DEPLOYMENT_REVISION_MISMATCH.
export const GOVERNANCE_CLIENT_VERSION = "2026-10-26";
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
  "authorityConformance": {
    "method": "POST",
    "path": "/v1/authority-conformance",
    "api_key": false,
    "summary": "Four disposable synthetic lab principals. Harmless draft effects only; no production authority."
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
const inBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
export class GovernanceClient {
  constructor({baseUrl = 'https://africanmarketos.com', apiKey = null, fetch: fetchImpl = globalThis.fetch, responseProfile = 'full_advisory', headers = {}, timeoutMs = 30000, expectedRevision = null, userAgent = 'amos-governance-client-js/' + GOVERNANCE_CLIENT_VERSION} = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw new RangeError('timeoutMs must be between 1 and 600000');
    if (expectedRevision !== null && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(expectedRevision)) throw new TypeError('expectedRevision must be a deployment identifier');
    this.baseUrl = String(baseUrl).replace(/\/$/, ''); this.apiKey = apiKey; this.fetch = fetchImpl; this.responseProfile = responseProfile; this.headers = headers;
    this.timeoutMs = timeoutMs; this.expectedRevision = expectedRevision; this.userAgent = userAgent;
  }
  async call(name, body, {signal, timeoutMs = this.timeoutMs} = {}) {
    const op = GOVERNANCE_OPERATIONS[name]; if (!op) throw new Error('Unknown governance operation: ' + name);
    if (op.api_key && !this.apiKey) throw new Error(op.path + ' needs an API key');
    const timeout = AbortSignal.timeout(timeoutMs), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const headers = {'Content-Type':'application/json', 'X-Response-Profile':this.responseProfile, ...(op.api_key ? {'X-API-Key':this.apiKey} : {}), ...(this.expectedRevision ? {'X-MVR-Expected-Deployment-Revision':this.expectedRevision} : {}), ...(!inBrowser && this.userAgent ? {'User-Agent':this.userAgent} : {}), ...this.headers};
    const response = await this.fetch(this.baseUrl + op.path, {method:op.method, redirect:'error', signal:combined, headers, ...(op.method === 'POST' ? {body:JSON.stringify(body ?? {})} : {})});
    let parsed = null; try { parsed = await response.json(); } catch { parsed = null; }
    const served = response.headers.get('X-MVR-Deployment-Revision');
    return {status:response.status, body:parsed, deployment_revision:served, revision_matches:this.expectedRevision ? served === this.expectedRevision : null};
  }
  /** POST /v1/review-cases (API key) */
  reviewCases(body, options) { return this.call('reviewCases', body, options); }
  /** GET /v1/review-cases/contract */
  reviewCasesContract(options) { return this.call('reviewCasesContract', undefined, options); }
  /** POST /v1/review-sandbox */
  reviewSandbox(body, options) { return this.call('reviewSandbox', body, options); }
  /** GET /v1/review-sandbox/contract */
  reviewSandboxContract(options) { return this.call('reviewSandboxContract', undefined, options); }
  /** POST /v1/authority-chain (API key) */
  authorityChain(body, options) { return this.call('authorityChain', body, options); }
  /** GET /v1/authority-chain/contract */
  authorityChainContract(options) { return this.call('authorityChainContract', undefined, options); }
  /** POST /v1/authority-receipts/verify */
  authorityReceiptsVerify(body, options) { return this.call('authorityReceiptsVerify', body, options); }
  /** POST /v1/reviewer-attestations (API key) */
  reviewerAttestations(body, options) { return this.call('reviewerAttestations', body, options); }
  /** GET /v1/reviewer-attestations/contract */
  reviewerAttestationsContract(options) { return this.call('reviewerAttestationsContract', undefined, options); }
  /** POST /v1/authority-conformance */
  authorityConformance(body, options) { return this.call('authorityConformance', body, options); }
  /** POST /v1/key-ceremony */
  keyCeremony(body, options) { return this.call('keyCeremony', body, options); }
  /** GET /v1/key-ceremony/status */
  keyCeremonyStatus(options) { return this.call('keyCeremonyStatus', undefined, options); }
  /** GET /v1/key-ceremony/contract */
  keyCeremonyContract(options) { return this.call('keyCeremonyContract', undefined, options); }
}
