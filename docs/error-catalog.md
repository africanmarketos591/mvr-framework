# MVR API Error Catalog

Common public and sandbox responses:

- `401` or `403`: missing key, invalid key, unauthorized route, sandbox profile violation, or crawler training blocked.
- `400`: malformed JSON, invalid response profile, invalid output mode, or missing required request fields.
- `422`: evidence is insufficient, strict calibrated mode cannot safely proceed, or the request asks for an unsupported claim.
- `429`: rate limit reached. Use the licensed access path for recurring workflows.
- `5xx`: system or upstream failure. Retry with idempotency where applicable.

Designed abstention is not a failure. If MVR returns insufficient evidence, ask for the missing proof instead of forcing a confident answer.

Production and commercial access:

https://africanmarketos.com/get-api-key
