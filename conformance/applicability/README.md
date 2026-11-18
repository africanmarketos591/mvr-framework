# Applicability statements

An applicability receipt records how AMOS routed one exact task: whether it is market-relevant, internal work, or a request AMOS must not assess. A statement is the portable form of that receipt.

Send `X-MVR-Applicability-Statement: signed` with a licensed `POST /v1/effect-decision` or `POST /v1/first-call`. The response then carries `applicability_statement` (`mvr.applicability-statement/1`). It is:

- **signed** with Ed25519 by the Enterprise conformance root pinned in `trust/amos-conformance-trust-root.json`;
- **expiring**, one hour after `issued_at`;
- **bound** to the receipt id, the task digest and the routing decision;
- **checkable offline** with `verify.mjs`, without AMOS and without a credential.

```
node conformance/applicability/verify.mjs statement.json --receipt receipt.json
```

A valid statement proves that this root signed this routing result and that it has not expired. It does not authenticate the task's facts, confer standing, or permit any action. `execution_authorized` and `production_authority` are always `false`, and the verifier rejects a statement that says otherwise. A production signing key is not active until the receipt key ceremony is completed, so this realm is the conformance realm.
