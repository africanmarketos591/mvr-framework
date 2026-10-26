# Generated from the AMOS OpenAPI contract by scripts/generate-governance-client.mjs (https://github.com/africanmarketos591/mvr-framework).
# Contract version v6.32.0; operation subset SHA-256: 568c81efaf61f1773791b31c90ece3893149121748c2994c63ad452d565c8621. Do not edit by hand; regenerate instead.
"""AMOS governance client (Python standard library only).

Every method returns a dict {"status", "body", "deployment_revision", "revision_matches"} and does not raise on a coded
refusal. Network failures and timeouts raise. expected_revision pins the deployment: the server refuses a mismatch with
409 DEPLOYMENT_REVISION_MISMATCH. A User-Agent is always sent; the default Python one is blocked at the edge.
"""
import json
import re
import urllib.error
import urllib.request

GOVERNANCE_CLIENT_VERSION = "2026-10-26"
GOVERNANCE_OPERATIONS = json.loads("{\"reviewCases\":{\"method\":\"POST\",\"path\":\"/v1/review-cases\",\"api_key\":true,\"summary\":\"Create scoped review cases and internal planning workflows; link statements and recheck artifacts. Explicit evaluation grants are isolated. No external-action or evidence-truth authority.\"},\"reviewCasesContract\":{\"method\":\"GET\",\"path\":\"/v1/review-cases/contract\",\"api_key\":false,\"summary\":\"Discover the bounded review workflow, residual-risk taxonomy, current-state checks and input schema.\"},\"reviewSandbox\":{\"method\":\"POST\",\"path\":\"/v1/review-sandbox\",\"api_key\":false,\"summary\":\"Issue or use short-lived isolated synthetic reviewer sessions. Never a production identity or credential.\"},\"reviewSandboxContract\":{\"method\":\"GET\",\"path\":\"/v1/review-sandbox/contract\",\"api_key\":false,\"summary\":\"Discover isolated synthetic reviewer evaluation sessions.\"},\"authorityChain\":{\"method\":\"POST\",\"path\":\"/v1/authority-chain\",\"api_key\":true,\"summary\":\"Institution-signed authority checked by AMOS: register keys, reviewer standing and source records; close one residual at a time; register institution capabilities; verify a capability for one exact ef\"},\"authorityChainContract\":{\"method\":\"GET\",\"path\":\"/v1/authority-chain/contract\",\"api_key\":false,\"summary\":\"Discover the authority chain: who signs what, trust tiers, closure and capability rules, receipts and revocation.\"},\"authorityReceiptsVerify\":{\"method\":\"POST\",\"path\":\"/v1/authority-receipts/verify\",\"api_key\":false,\"summary\":\"Verify a complete authority receipt against the published registry. Lab keys require an explicit session and opt-in. No execution permission.\"},\"reviewerAttestations\":{\"method\":\"POST\",\"path\":\"/v1/reviewer-attestations\",\"api_key\":true,\"summary\":\"Create, inspect or withdraw an account-linked, explicitly shared, case-bound reviewer assertion. Not source verification, scoring evidence or action permission. Creation is idempotent by operation_id,\"},\"reviewerAttestationsContract\":{\"method\":\"GET\",\"path\":\"/v1/reviewer-attestations/contract\",\"api_key\":false,\"summary\":\"Discover the lightweight reviewer assertion workflow, account requirements and non-authorizing boundaries.\"},\"authorityConformance\":{\"method\":\"POST\",\"path\":\"/v1/authority-conformance\",\"api_key\":false,\"summary\":\"Four disposable synthetic lab principals. Harmless draft effects only; no production authority.\"},\"keyCeremony\":{\"method\":\"POST\",\"path\":\"/v1/key-ceremony\",\"api_key\":false,\"summary\":\"Made-in-Cloudflare receipt key ceremony: precheck, run once, confirm token deletion, or recover an interrupted run. The Cloudflare API token in the body is the authority; it is never stored. Grants no\"},\"keyCeremonyStatus\":{\"method\":\"GET\",\"path\":\"/v1/key-ceremony/status\",\"api_key\":false,\"summary\":\"Public state of the receipt key ceremony, the signed birth record and its verification, and the private key binding metadata (never the key).\"},\"keyCeremonyContract\":{\"method\":\"GET\",\"path\":\"/v1/key-ceremony/contract\",\"api_key\":false,\"summary\":\"How the made-in-Cloudflare receipt key ceremony works, its refusals and custody.\"}}")


class GovernanceClient:
    def __init__(self, base_url="https://africanmarketos.com", api_key=None, response_profile="full_advisory", timeout=30.0,
                 expected_revision=None, user_agent="amos-governance-client-python/" + GOVERNANCE_CLIENT_VERSION, headers=None, opener=None):
        if not (isinstance(timeout, (int, float)) and 0 < timeout <= 600):
            raise ValueError("timeout must be between 0 and 600 seconds")
        if expected_revision is not None and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", expected_revision):
            raise ValueError("expected_revision must be a deployment identifier")
        self.base_url = str(base_url).rstrip("/")
        self.api_key = api_key
        self.response_profile = response_profile
        self.timeout = float(timeout)
        self.expected_revision = expected_revision
        self.user_agent = user_agent
        self.headers = dict(headers or {})
        self.opener = opener or urllib.request.build_opener()

    def call(self, name, body=None, timeout=None):
        op = GOVERNANCE_OPERATIONS.get(name)
        if op is None:
            raise KeyError("Unknown governance operation: " + name)
        if op["api_key"] and not self.api_key:
            raise ValueError(op["path"] + " needs an API key")
        headers = {"Content-Type": "application/json", "X-Response-Profile": self.response_profile, "User-Agent": self.user_agent}
        if op["api_key"]:
            headers["X-API-Key"] = self.api_key
        if self.expected_revision:
            headers["X-MVR-Expected-Deployment-Revision"] = self.expected_revision
        headers.update(self.headers)
        data = json.dumps(body if body is not None else {}, separators=(",", ":")).encode("utf-8") if op["method"] == "POST" else None
        request = urllib.request.Request(self.base_url + op["path"], data=data, headers=headers, method=op["method"])
        try:
            response = self.opener.open(request, timeout=self.timeout if timeout is None else timeout)
            status, raw, served = response.status, response.read(), response.headers.get("X-MVR-Deployment-Revision")
        except urllib.error.HTTPError as error:
            status, raw, served = error.code, error.read(), error.headers.get("X-MVR-Deployment-Revision")
        try:
            parsed = json.loads(raw.decode("utf-8")) if raw else None
        except ValueError:
            parsed = None
        return {"status": status, "body": parsed, "deployment_revision": served,
                "revision_matches": (served == self.expected_revision) if self.expected_revision else None}

    def review_cases(self, body, timeout=None):
        """POST /v1/review-cases (API key)."""
        return self.call("reviewCases", body, timeout=timeout)

    def review_cases_contract(self, timeout=None):
        """GET /v1/review-cases/contract."""
        return self.call("reviewCasesContract", None, timeout=timeout)

    def review_sandbox(self, body, timeout=None):
        """POST /v1/review-sandbox."""
        return self.call("reviewSandbox", body, timeout=timeout)

    def review_sandbox_contract(self, timeout=None):
        """GET /v1/review-sandbox/contract."""
        return self.call("reviewSandboxContract", None, timeout=timeout)

    def authority_chain(self, body, timeout=None):
        """POST /v1/authority-chain (API key)."""
        return self.call("authorityChain", body, timeout=timeout)

    def authority_chain_contract(self, timeout=None):
        """GET /v1/authority-chain/contract."""
        return self.call("authorityChainContract", None, timeout=timeout)

    def authority_receipts_verify(self, body, timeout=None):
        """POST /v1/authority-receipts/verify."""
        return self.call("authorityReceiptsVerify", body, timeout=timeout)

    def reviewer_attestations(self, body, timeout=None):
        """POST /v1/reviewer-attestations (API key)."""
        return self.call("reviewerAttestations", body, timeout=timeout)

    def reviewer_attestations_contract(self, timeout=None):
        """GET /v1/reviewer-attestations/contract."""
        return self.call("reviewerAttestationsContract", None, timeout=timeout)

    def authority_conformance(self, body, timeout=None):
        """POST /v1/authority-conformance."""
        return self.call("authorityConformance", body, timeout=timeout)

    def key_ceremony(self, body, timeout=None):
        """POST /v1/key-ceremony."""
        return self.call("keyCeremony", body, timeout=timeout)

    def key_ceremony_status(self, timeout=None):
        """GET /v1/key-ceremony/status."""
        return self.call("keyCeremonyStatus", None, timeout=timeout)

    def key_ceremony_contract(self, timeout=None):
        """GET /v1/key-ceremony/contract."""
        return self.call("keyCeremonyContract", None, timeout=timeout)
