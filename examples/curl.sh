#!/usr/bin/env bash
set -euo pipefail

MVR_BASE_URL="${MVR_BASE_URL:-https://africanmarketos.com}"
MVR_API_KEY="${MVR_API_KEY:-mvr-demo-key-2026}"

curl -sS -X POST "${MVR_BASE_URL}/v1/entity-resolve" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${MVR_API_KEY}" \
  -d '{
    "entity_name": "MTN Nigeria",
    "country": "NG"
  }'
