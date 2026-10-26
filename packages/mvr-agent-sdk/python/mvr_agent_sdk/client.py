import hashlib
import json
import os
import re
from urllib import request as urlrequest
from urllib.error import HTTPError

MVR_AGENT_SDK_VERSION = "0.2.0"


class MvrPreflightClient:
    def __init__(self, api_key=None, base_url="https://africanmarketos.com", response_profile="full_advisory", timeout=30.0,
                 expected_revision=None, user_agent=None):
        self.api_key = api_key or os.environ.get("MVR_API_KEY") or "mvr-demo-key-2026"
        self.base_url = base_url.rstrip("/")
        self.response_profile = response_profile
        # Every request has a deadline. expected_revision pins one deployment: the server refuses a mismatch with 409.
        if not (isinstance(timeout, (int, float)) and 0 < timeout <= 600):
            raise ValueError("timeout must be between 0 and 600 seconds")
        if expected_revision is not None and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", expected_revision):
            raise ValueError("expected_revision must be a deployment identifier")
        self.timeout = float(timeout)
        self.expected_revision = expected_revision
        # urllib's default User-Agent is refused at the edge (Cloudflare 1010), so one is always sent.
        self.user_agent = user_agent or "mvr-agent-sdk-python/" + MVR_AGENT_SDK_VERSION
        self.last_deployment_revision = None

    def request(self, path, body=None, method="POST", idempotency_key=None, timeout=None):
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "X-Response-Profile": self.response_profile,
            "X-MVR-SDK": "mvr-agent-sdk-python/" + MVR_AGENT_SDK_VERSION,
            "User-Agent": self.user_agent,
        }
        if self.expected_revision:
            headers["X-MVR-Expected-Deployment-Revision"] = self.expected_revision
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        data = None if body is None else json.dumps(body, separators=(",", ":")).encode("utf-8")
        req = urlrequest.Request(f"{self.base_url}{path}", data=data, headers=headers, method=method)
        try:
            with urlrequest.urlopen(req, timeout=self.timeout if timeout is None else timeout) as res:
                self.last_deployment_revision = res.headers.get("X-MVR-Deployment-Revision")
                text = res.read().decode("utf-8")
                return json.loads(text) if text else {}
        except HTTPError as exc:
            self.last_deployment_revision = exc.headers.get("X-MVR-Deployment-Revision") if exc.headers else None
            text = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(text)
            except Exception:
                payload = {"status": "invalid_error_json", "raw": text}
            err = RuntimeError(payload.get("error", {}).get("message") if isinstance(payload.get("error"), dict) else payload.get("error", f"MVR API request failed: {exc.code}"))
            err.status = exc.code
            err.code = payload.get("code") if isinstance(payload, dict) else None
            err.response = payload
            err.deployment_revision = self.last_deployment_revision
            raise err

    def auth_check(self):
        return self.request("/v1/auth-check", {})

    def entity_resolve(self, payload):
        return self.request("/v1/entity-resolve", payload)

    def evidence_completeness(self, payload):
        return self.request("/v1/evidence-completeness", payload)

    def context_compile(self, payload):
        return self.request("/v1/context/compile", payload)

    def decision_check(self, payload, idempotency_key=None):
        return self.request("/v1/decision-check", payload, idempotency_key=idempotency_key or deterministic_idempotency_key(payload))

    def preflight_market_entry(self, payload):
        subject = payload.get("subject") or {
            "entity_name": payload.get("company_name") or payload.get("entity_name") or "Unknown subject",
            "entity_archetype": payload.get("entity_archetype") or payload.get("archetype") or payload.get("sector") or "general_venture",
            "sector": payload.get("sector"),
        }
        market_scope = payload.get("market_scope") or {
            "country": payload.get("country"),
            "city": payload.get("city"),
            "region": payload.get("region"),
        }
        evidence_pack = payload.get("evidence_pack") or []
        entity = self.entity_resolve({**payload, "subject": subject, "market_scope": market_scope})
        completeness_payload = {**payload, "subject": subject, "market_scope": market_scope, "evidence_pack": evidence_pack}
        completeness = self.evidence_completeness(completeness_payload)
        has_enough = completeness.get("decision_ready") is True or completeness.get("status") == "decision_ready"
        if not has_enough and not evidence_pack:
            return {
                "status": "abstained",
                "reason": "evidence_required_before_decision_check",
                "entity": entity,
                "evidence_completeness": completeness,
                "recommended_next_step": "Collect provenance-backed local evidence, then call /v1/decision-check.",
                "mvr_api_called_for_final_verdict": False,
            }
        decision_payload = {
            "mode": "evidence_backed" if evidence_pack else "exploratory",
            "case_type": payload.get("case_type") or "market_entry",
            "subject": subject,
            "market_scope": market_scope,
            "stakeholder_scope": payload.get("stakeholder_scope"),
            "evidence_pack": evidence_pack,
        }
        decision = self.decision_check(decision_payload)
        return {"status": "ok", "entity": entity, "evidence_completeness": completeness, "decision": decision}


def deterministic_idempotency_key(payload):
    raw = json.dumps(payload or {}, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:64]
    return f"mvr-py-{digest}"
