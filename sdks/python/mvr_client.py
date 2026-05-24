"""Lightweight MVR API reference client.

This file is a copy-pasteable client for agent and developer evaluation. It
does not expose private scoring logic and should not be treated as a full SDK.
"""

from __future__ import annotations

import os
from typing import Any

import requests


class MvrClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://africanmarketos.com",
        timeout: int = 90,
    ) -> None:
        self.api_key = api_key or os.getenv("MVR_API_KEY", "mvr-demo-key-2026")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _post(self, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}{path}",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
                "X-Response-Profile": "full_advisory",
            },
            json=payload or {},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.json()

    def auth_check(self) -> dict[str, Any]:
        return self._post("/v1/auth-check", {})

    def entity_resolve(self, entity_name: str, country: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"entity_name": entity_name}
        if country:
            payload["country"] = country
        return self._post("/v1/entity-resolve", payload)

    def evidence_completeness(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/v1/evidence-completeness", payload)

    def decision_check(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/v1/decision-check", payload)


if __name__ == "__main__":
    client = MvrClient()
    print(client.entity_resolve("MTN Nigeria", country="NG"))

