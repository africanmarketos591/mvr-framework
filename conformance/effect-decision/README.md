# Exact-effect decision conformance (`mvr.effect-decision/1`)

For every requested effect, `POST /v1/effect-decision` (and the licensed MCP tool `mvr_effect_decision`, same body) returns three separate states:

- `analytical_evidence_status`: `favorable | conditional | insufficient | adverse | not_relevant`, from the supplied record alone;
- `institutional_authority_status`: `authorized | planning_only | not_authorized | revoked | expired | not_applicable`. Only an institution-signed capability, read through `/v1/authority-chain` `check_permission`, can make it `authorized`;
- `execution_authorization_status`: `authorized` only when authority is authorized and the analysis is favourable.

Each effect also carries its precedence rule, reason codes, controlling and excluded records, dependencies, supported scope, the smallest decisive closure with a machine-checkable acceptance condition, the accountable role and the permitted interim scope. `dependency_index` maps every claim and record to the effects that depend on it. The contract, taxonomy and precedence table are public at `/v1/effect-decision/contract`.

`cohort.json` holds the frozen cases (proprietary lab fixtures): complete, missing, conditional, irrelevant addition, revoked permission, revoked licence dependency, prohibition, stale, contradiction, expired permission, superseded contradiction, internal-only and mixed. Each states every effect's expected states. `internal-controls.json` holds the eight internal non-market tasks that must stop on `mvr_first_call`.

```
MVR_API_KEY=... node conformance/effect-decision/run-live.mjs --out effect-decision-live.json
```

The runner checks both licensed profiles over REST and MCP: the exact effect set and states, REST/MCP parity after transport wrappers, no contradicting root field, the release-manifest header, the internal controls and the mixed-request split.
