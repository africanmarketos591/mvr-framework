# Errors, Status Codes, and Rate Limits

Common HTTP behavior:

- `200` - request processed; read `status`, `decision_reliability`, and `response_meta`.
- `400` - malformed request or unsupported parameter.
- `401` - missing or invalid API key.
- `403` - route not allowed for this key, plan, role, or output mode.
- `404` - route or resource not found.
- `422` - valid JSON but insufficient or invalid input for the requested route.
- `429` - rate limit exceeded.
- `500` - server error.

Common MVR result statuses:

- `ok`
- `invalid_input`
- `missing_inputs`
- `insufficient_evidence`
- `insufficient_calibration`
- `abstained`
- `review_required`

Rate-limit draft:

- Sandbox: 60 requests/minute and 500 requests/day.
- Starter: 300 requests/minute soft ceiling.
- Pro: 3000 requests/minute soft ceiling.
- Enterprise: custom tenant-scoped limits.

The public sandbox key is intentionally lower than paid tenant keys and may be adjusted if abused. Production limits are enforced from deployed key policy.
