# R10 qualification

Run the 112-cell comparison with MVR_API_KEY set to a licensed Enterprise key and pass the report path as the first argument to node conformance/r10-qualification/no-retry.mjs. Each of the 56 frozen AMOS cases runs under both profiles. Each cell calls licensed first-call MCP and REST effect-decision once, with no application retries. Success requires an HTTP success, an expected application response and a matching release-manifest header. The report records each layer separately. The evaluator's original harness was unavailable.

Use conformance/enterprise-conformance/run-live.mjs for alias portability and submit-to-subscriber revocation latency. Use conformance/receiver-kit/run-reference-staging.mjs for the SQLite reference HTTP adapter and restart test. To exercise a buyer-operated receiver use the same HTTP suite, conformance/receiver-kit/http-conformance.mjs, with its designated staging URL and fault hooks.

The feed wire specification and independent verification tools are in conformance/receiver-kit/feed-vectors.
