#!/usr/bin/env bash
set -euo pipefail

: "${MVR_API_KEY:?Set MVR_API_KEY first}"

curl -sS https://africanmarketos.com/v1/entity-resolve \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${MVR_API_KEY}" \
  -d '{"query":"MTN Nigeria","country":"NG"}'

