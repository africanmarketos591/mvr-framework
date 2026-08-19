# Methodology and Calibration Note

MVR is a relational-readiness framework. It evaluates whether a decision has enough trust, permission, embeddedness, stakeholder coverage, evidence quality, and local legitimacy to proceed.

The API is designed to be conservative:

- weak evidence lowers confidence ceilings
- missing stakeholder lanes create gaps
- stale regulatory proof expires quickly
- proxy-heavy evidence can force abstention
- strict mode may refuse to produce a verdict

Important transparency:

Lab and fixture calibration are not the same as live field accuracy. Published benchmark claims must distinguish:

- historical replay
- synthetic fixtures
- public-information baselines
- client-provided evidence
- field-verified evidence

Named-entity corpus baselines are sector reference baselines. They are not company-specific ratings or endorsements.

## Evidence Dependence and Claim Release

Evidence count and source count are not measures of independence. Two items may share the same event, dataset, method, instrument, collector, parent record, or error process even when they have different URLs, publishers, or source labels.

The public provenance exchange schema therefore supports explicit dependency metadata. A source hostname is only a discovery hint. It is not proof that an item is independent.

For a claim to be eligible for a board-safe technical release state, the governed runtime requires exact reviewed-content binding, eligible human review, at least two verified support items in two effective independent dependency components, privacy eligibility, and no unresolved or inferred legacy provenance. Caller-supplied citations or waivers cannot create verified support.

This is an evidence-governance condition, not a legal opinion, external certification, or guarantee that the underlying claim is true.
