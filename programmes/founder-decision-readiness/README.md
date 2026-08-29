# Founder Decision Readiness

Founder Decision Readiness is a founder-controlled planning layer for programmes that keep four distinct planes connected: private Self reflection, one Business decision, Ecosystem evidence and permission, and a founder-approved Integration handoff.

The public browser-local lab is available at:

https://africanmarketos.com/founder-decision-readiness/

The public facilitator protocol is available at:

https://africanmarketos.com/facilitator-field-guide/

Its current machine-readable export contract is:

`../../standards/founder-decision-evidence-pack-v1.1.schema.json`

The v1.0 schema remains published as a provenance contract.

## Intended Use

The lab helps a founder name one consequential decision, describe its operating context, compare two real alternatives with doing nothing, name ownership and required approvals, optionally rewrite one private observation as an observable business action, take a non-scored evidence snapshot, identify any external permission or behaviour the decision depends on, define one reversible experiment, and optionally create a portable Decision Evidence Pack or minimized support slice.

After the pack is generated, the founder may separately export a minimized, non-confidential MVR preflight handoff. That handoff names `POST /v1/first-call` and `mvr_first_call`, but this browser-local page never submits it. The founder must inspect and deliberately authorize the exact payload before a facilitator or agent uses it.

It is not a founder assessment, psychometric instrument, MVR verdict, evidence verification, programme score, funding recommendation, prediction, certification, or authorization.

## Separation Rules

- Private Self reflection stays in the founder's browser and is excluded from export.
- The lab does not ask for or infer trauma, childhood causes, attachment, personality, diagnosis, mental health, or founder quality.
- A business translation is included only when the founder writes and opts into it; no Self result is imported.
- The context passport records a non-confidential venture label, sector, stage, operating model, current founder role, primary ISO-2 country code, local market/city/district/corridor, segment, and offering. These are working context fields, not verified identity or classification claims.
- Stage, operating model, and founder role default to `not_stated`; leaving a menu untouched cannot silently label the venture or person.
- The MVR handoff maps the primary country to `country` and `market_scope.country`, and maps the local market/city/district/corridor separately to `market_scope.town_or_zone`.
- Option A, Option B, doing nothing, decision criteria, exposure, accountable owner, and required approvals remain visible in the founder's Decision Board.
- An external dependency without bounded permission and at least some current evidence caps the safe next action at evidence gathering or specialist review.
- Any safe-action ceiling is shown before export and recorded separately from the founder's evidence gaps. The Decision Board preserves both the founder-selected candidate and the more cautious applied ceiling.
- All three founder-selected priority gaps are preserved. A system-applied relational-dependency constraint is a separate record and cannot evict a founder gap.
- The founder chooses whether to create, download, correct, share, or withhold the pack.
- The founder may explicitly save, restore, or delete a non-private working copy on the current device. There is no automatic save or account sync; private pre-mortem scratch and generated packs are excluded from the saved working copy.
- Plain-text and support-slice exports use human-readable labels and omit declined optional sections. JSON retains the stable machine contract.
- The minimized support slice is for a founder-selected coach or programme support conversation. It is not an external diligence, assurance, verification, selection, or decision-authorization record.
- The separate MVR preflight handoff excludes private Self material, private scratch, detailed evidence observations, contact details and personal identifiers, the pack identifier, and any Diagnostic response total or reflection band.
- Evidence-state labels in the handoff are founder-declared categories, not reviewed evidence. With observations and artifacts withheld, `mvr_first_call` can return a missing-context/evidence-gap map and next-tool route but cannot evaluate authenticity, relevance, source quality, readiness, or claim truth.
- The MVR preflight handoff creates no automatic network call, score, verdict, or decision authorization. Consequential use still requires human review and the appropriate governed route.
- Coaches do not request private reflection, diagnose founders, verify claims, rank participants, or decide funding.
- Programme operators and sponsors must not require completion or disclosure for admission, support, employment, funding, or standing.
- The seven operating lenses are not the current MVR Diagnostic roots and are not a validated scale.
- No third-party source or witness is contacted in the rehearsal. Independent claim-level assurance is deferred until usefulness, safety, review procedure, privacy governance, and paid selector demand are established; any later assurance record must remain separate and consented.

## Deployment State

The browser-local lab is a public beta. The first programme step is a two-week usability and safety rehearsal with 4-6 founders and 1-2 coaches. Every coach must first pass two boundary role plays. The rehearsal requires zero requests for private reflection, zero sensitive Self content in programme records, and founder comprehension of the pack's non-verified, non-authorizing status. A facilitated 8-12 founder pilot may begin only after the specific parties approve data roles, access, retention, participant rights, safeguarding, research separation, and any cross-border processing terms.

No cohort has yet established programme impact, prediction, psychometric validity, investability, selector acceptance, or external evidence reuse. Any such claim requires a separate prospective design and appropriate independent review.

## Currentness and Continuity

The v1.1 pack carries a random browser-generated `pack_id`, `schema_version`, stable lens identifiers, and a generation timestamp that also marks when the evidence snapshot was taken. `pack_expires_at` is a founder-set currentness review deadline derived from the decision horizon. It is not AMOS-certified validity and does not establish the freshness or expiry of any source fact.

`founder_held_reference` is an optional founder-controlled local alias. A pseudonym is not anonymous, and the alias is not assigned or verified by AMOS. It should not contain names, contact details, account numbers, or programme identifiers.

A future, separately consented assurance record could reference an immutable pack by `pack_id`, `schema_version`, and a JSON Pointer or stable lens identifier. It must not rewrite or convert the founder-generated pack into a verified record.

The optional calendar export creates a private evidence-review cadence rather than storing the decision itself: a fortnightly evidence check, a midpoint stop-rule check, and the founder-set final review date. Event titles and descriptions contain no decision text, founder reference, pack identifier, or venture name.

## Facilitator Protocol

The Facilitator Field Guide is a static, no-account protocol. It collects no answers and creates no programme dashboard, cohort ranking, assurance result, investor score, or custody system. It teaches the four-plane journey, a 90-second read order, an executable 60-90 minute session, stage- and context-aware evidence questions, facilitator calibration, unsafe-pack recognition, private-Self boundaries, the founder-approved MVR handoff, an optional six-month programme rhythm, and escalation outside the instrument. The founder chooses what to share.

## Deliberate Deferrals

The current beta is the planning half of a decision cycle. Decision Closeout, prior-pack import, cross-pack history, claim-level identifiers, accounts, cohort dashboards, automatic API submission, and an external assurance surface are not live. They remain possible later only if the 4-6 founder rehearsal shows that founders complete the present flow, return to review evidence, understand its boundaries, and derive useful decisions from it.

The Lab is a deep decision session, not a required weekly ritual: allow roughly 30-60 minutes for a careful self-guided first pass or 60-90 minutes with a facilitator. Founder Operating Patterns and the MVR Diagnostic are separate optional instruments and need not be completed in the same sitting.

## Commercial Route

Programmes, accelerators, foundations, funds, universities, and DFIs can propose a bounded rehearsal through:

https://africanmarketos.com/work-with-us/?service=founder_decision_readiness_pilot#brief

The operator or sponsor pays after written scope confirmation. Founders receive no AMOS invoice. No public fixed price is claimed before delivery and governance scope are known.
