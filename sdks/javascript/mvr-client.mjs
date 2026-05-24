// Lightweight MVR API reference client.
// This is not a package-manager SDK yet; it is a safe integration template.

import { fileURLToPath } from "node:url";

export class MvrClient {
  constructor({
    apiKey = process.env.MVR_API_KEY || "mvr-demo-key-2026",
    baseUrl = "https://africanmarketos.com",
    timeoutMs = 90000
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async post(path, payload = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
          "X-Response-Profile": "full_advisory"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const result = await response.json();
      if (!response.ok) {
        const error = new Error(`MVR API HTTP ${response.status}`);
        error.status = response.status;
        error.response = result;
        throw error;
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  authCheck() {
    return this.post("/v1/auth-check", {});
  }

  entityResolve(entityName, country) {
    const payload = { entity_name: entityName };
    if (country) payload.country = country;
    return this.post("/v1/entity-resolve", payload);
  }

  evidenceCompleteness(payload) {
    return this.post("/v1/evidence-completeness", payload);
  }

  decisionCheck(payload) {
    return this.post("/v1/decision-check", payload);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const client = new MvrClient();
  console.log(await client.entityResolve("MTN Nigeria", "NG"));
}
