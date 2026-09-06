# African Market OS-MVR API: calibration scope consistency

Deployment revision: `2026-09-06.engine-contract.3`.

The category playbook and decision response now use the same definition of `calibration_basis.proxy_substitution`: whether the requested archetype differs from the public metric registry used. The companion `proxy_substitution_scope` is explicitly `public_metric_registry`.

A second field, `calibration_guardrail_active`, says whether the configured or evaluated engine path retains its calibration guardrail. These are different facts. Matching the metric catalogue does not establish purpose-built calibration, outcome validation, or permission to remove a guardrail.

| Requested archetype | Metric catalogue | Catalogue substituted | Calibration guardrail |
| --- | --- | --- | --- |
| `fintech_lending` | `fintech_lending` | false | active |
| `logistics_platform` | `logistics_platform` | false | active |
| `retail_chain` | `ecommerce_platform` | true | active |

The configured model keys are respectively `fintech`, `logistics` and `ecommerce`. A model-key difference is not, on its own, empirical proof of either inappropriate borrowing or purpose-built validation. This update reports the existing guardrail state without changing that policy, its confidence caps or authorization rules. `basis_tier` remains `proxy_or_interim_calibration` where that guardrail is active.

If the actual metric registry is unavailable, `proxy_substitution` is null, not a guessed true or false. `calibration_scope` retains its existing requested/submitted-scope fallback for compatibility; that fallback does not establish an evaluated registry. An unknown guardrail state is also null.

Preserve `requested_archetype`, `calibration_scope`, `proxy_substitution`, `proxy_substitution_scope`, `calibration_guardrail_active`, `basis_tier`, `outcome_validated` and the authorization limitations when citing or carrying a result between tools. The response metadata mirrors the key flags. The detailed `public_reality.calibration_proxy` object remains intact.

The regression suite now varies one stakeholder class at a time, independently searches its first passing sample count, and checks adjacent boundaries across four field-collection methods against the published sample contract. These tests establish reproducibility of those sampling rules, not empirical validation of the numerical floors or public reproducibility of the entire protected engine.

No tool has been renamed, no sample threshold changed, no price or licensed scope changed, and the OpenAI `/mcp/` compatibility endpoint remains available.
