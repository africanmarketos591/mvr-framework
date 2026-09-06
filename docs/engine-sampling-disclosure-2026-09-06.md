# African Market OS-MVR API: sampling and calibration disclosure

Deployment revision: `2026-09-06.engine-contract.2`. Core API, SDK versions, licensed scopes and MCP tool profiles are unchanged.

## Three different quantities

- A playbook's legacy `minimum_signal_count` is a collection-starting hint. It is not a weighted sample-admission floor or a promise of representativeness.
- `sample_size` describes participants or applicable typed records in an evidence item. Three evidence rows with three participants each are not one three-person sample. Overlapping respondents must not be counted as independent depth.
- Weighted sample depth sums admitted item sample sizes multiplied by collection-method weight, separately for each canonical stakeholder class. It is not the number of guardian tiers or source documents.

Playbooks now expose `minimum_signal_count_is_sample_admission_floor: false`, `weighted_sample_minimum_by_maturity`, and the complete `field_sample_contract`. The published values reuse the same resolver as completeness and decision scoring, including existing solo-entrepreneur overrides. No floor has been reduced to two.

For the key-informant example in the review, method weight is 1.0. Regulator normalizes to guardian, whose existing floor is 15; community leader and land custodian each have a floor of 10. These are existing engine sufficiency rules, not a universal requirement to interview 25 regulators. A hypothetical n=10 pack can still display 0.35 confidence while the guardian gate fails. Read `decision_authorization`, not confidence alone.

Small purposive interviews can be useful for scoped permission and role mapping. They do not automatically support population-wide readiness. Record authority, remit, dated permission, scope and objections; keep claims within that evidence's reach. Do not inflate sample sizes, duplicate respondents or change method labels to obtain a higher score. A finite-authority or qualitative-only use case may need governed methodology review, not more invented respondents. [CDC's qualitative-data guidance](https://www.cdc.gov/field-epi-manual/php/chapters/qualitative-data.html) distinguishes purposive qualitative sampling from generalizable quantitative inference; it does not validate AMOS's numeric thresholds.

`local_relational_assessment.sample_sufficiency` now explicitly reports whether the gate passed, required weighted samples, observed weighted samples and unresolved issues. Completeness no longer rounds a below-floor sample into a pass.

## Calibration at the decision point

`calibration_basis` and its `response_meta` summary now include `requested_archetype` and `proxy_substitution`. An active proxy takes precedence over empirical provenance of the borrowed model in `basis_tier`. This prevents "empirically sourced" from obscuring the scope of a substitution. The existing `public_reality.calibration_proxy` remains available for the full explanation.

`proxy_substitution: null` means no evaluated substitution state was available; it must not be interpreted as proof of purpose-built calibration. A false value likewise does not establish outcome validation.

The changes clarify interpretation and align admission diagnostics. They do not grant execution, credit, investment or regulatory authorization, and do not claim a new retail calibration or comparative model superiority.
