# Evidence Provenance and Claim Release Evidence

This release hardens the distinction between having multiple evidence items and having independently supporting evidence.

The protected runtime now:

- marks migrated or synthesized provenance as inferred or imputed rather than observed;
- evaluates shared upstream events, datasets, methods, instruments, collectors, parent sources, and error processes;
- binds an evidence review to the normalized content that was actually reviewed;
- treats caller-supplied citations and waivers as insufficient to manufacture verified support;
- requires two verified support items in two effective independent dependency components for a board-safe technical release state; and
- accepts the same `regulatory_shock` and `evidence_staleness` events that its watchlist cascade emits.

Founder Operating Patterns remains private, ephemeral, non-scored, and non-selector-facing. Suggested experiments are limited to reversible, low-consequence internal actions with stop and rollback rules. Safety, safeguarding, security, legal, regulatory, confidential-data, employment, payment, and irreversible decisions remain outside that exercise.

A production canary caught and closed a separate public-contract mismatch during this release: `entity_name` was accepted by first-call validation but not read by the activation parser. The corrected deployment preserves `entity_name`, issues a bounded workflow, and returns `mvr_entity_resolve` as the exact next tool while remaining non-verdict and non-scoring.

`EVIDENCE_PROVENANCE_LIVE_CANARY.json` records the exact source commit, Cloudflare provider revision, SBOM hash, local test gates, and post-deployment canaries. It is a technical release receipt, not external validation, a market-readiness claim, or evidence that any commercial outcome improved.
