# Local review product evidence — 24 October 2026

This release adds three runnable **host-side** features: bounded decisive-review planning, hold lifecycle tracking, and captured-proposal comparisons. It is not a deployment to the hosted Worker or a production authority activation. [Usage and limits](../../examples/decision-review-workbench/README.md).

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

Run with Node.js 24.11 or later, no dependencies, credentials or network:

```sh
node release-evidence/2026-10-24-review-workbench/verify.mjs
```

The verifier checks exact source/demo/workflow hashes, reruns nine test groups, compares the generated demonstration byte for byte, and reproduces the stored evidence. The independent truth-table oracle compares 6,912 cases: every three-input Boolean function under every partial observation. Additional controls cover the eight-referenced-fact limit, source/scope/validity changes, tampering, duplicate/future reviews, hold lifecycle and deadline constraints, journal head mismatch, counterfactual scope/chronology mutations, and the actual CLI.

`evidence.json` records the results and file digests. File hashes prove a match to these published bytes, not identity, independent authorship or institutional authority. The test fixtures and oracle are public for reproduction. The oracle tests logical planning, not the truth or completeness of a real-world evidence model. The eight-fact maximum has a separate regression; exhaustive truth-table enumeration is limited to three inputs.

The demonstration's 24 items, three referenced facts, one-observation stop certificate, two holds and comparison are synthetic. No real person's standing, document authenticity, financial savings or measured analyst-time improvement is claimed. No Google permissions, cloud billing or production gates changed in this release.

The report was visually inspected in the local browser, including expansion of its evidence section. That is an operator UI check, not an automated cross-browser accessibility certification.
