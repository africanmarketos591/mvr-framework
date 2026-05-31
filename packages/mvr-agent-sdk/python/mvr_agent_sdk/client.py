import hashlib
import json
import os
from urllib import request as urlrequest
from urllib.error import HTTPError


class MvrPreflightClient:
    def __init__(self, api_key=None, base_url="https://africanmarketos.com", response_profile="full_advisory"):
        self.api_key = api_key or os.environ.get("MVR_API_KEY") or "mvr-demo-key-2026"
        self.base_url = base_url.rstrip("/")
        self.response_profile = response_profile

    def request(self, path, body=None, method="POST", idempotency_key=None):
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "X-Response-Profile": self.response_profile,
            "X-MVR-SDK": "mvr-agent-sdk-python/0.1.0",
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        data = None if body is None else json.dumps(body, separators=(",", ":")).encode("utf-8")
        req = urlrequest.Request(f"{self.base_url}{path}", data=data, headers=headers, method=method)
        try:
            with urlrequest.urlopen(req, timeout=30) as res:
                text = res.read().decode("utf-8")
                return json.loads(text) if text else {}
        except HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(text)
            except Exception:
                payload = {"status": "invalid_error_json", "raw": text}
            err = RuntimeError(payload.get("error", {}).get("message") if isinstance(payload.get("error"), dict) else payload.get("error", f"MVR API request failed: {exc.code}"))
            err.status = exc.code
            err.response = payload
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
