# Persisted-review five-stage fixture

This fixture tests AMOS software with explicitly fictional records. It does not
measure predictive accuracy, authenticate an institution, or establish that any
interviews, licences, contracts or fieldwork occurred. The collection facts,
district coverage and source records are stipulated properties of this new lab
fixture, not corrections to a developer's or customer's evidence.

`mcp-positive-input.json` is the complete published input. Each original evidence
object is canonicalized and hashed before review metadata is added. The runner
creates an ephemeral lab standing issuer, registers a signature-bound standing
credential for the authenticated reviewer account, and persists nine exact
source/claim reviews through the ordinary review API. It also creates a protected
review case and a scoped attestation using separate account credentials.

It follows the five returned MCP calls unchanged, checks protected references
are not echoed, requires all nine reviewed links to remain valid, and requires
the strict profile to permit only listed analysis uses. It asserts that execution
permission is false and that no action capability exists. Replaying a consumed
handoff must fail. Cleanup revokes the attestation and issuer and withdraws the
case; an interrupted process may require operator cleanup. Reviews expire within
30 minutes and issuer/standing records within one hour. API credentials remain
the provisioning operator's responsibility.

Run only against an authorized lab tenant with two separately provisioned
credentials, sufficient calibration assets and access to the MCP, evidence
review, review case, attestation and authority routes:

```sh
node conformance/authority/run-positive-mcp.mjs --base https://authorized-host.example --output new-positive-result.json
```

Supply credentials through `AMOS_FIXTURE_CREATOR_KEY` and
`AMOS_FIXTURE_REVIEWER_KEY`, never command-line arguments or committed files.
The creator needs authority administration and case lifecycle access; the
reviewer needs reviewer and attestor roles. Distinct credentials are not proof
of distinct or independent humans. Both are lab principals.

The local acceptance suite uses the repository's pinned private calibration
fixture bundle and the canonical durable runtime. Normal strict infrastructure
checks remain enabled; the relaxed strict-calibration setting is absent. These
are lab prerequisites, not production calibration evidence. An environment
without sufficient calibration must fail this positive test. The advisory
profile is separately checked as a negative control for formal output-use
permission. The homogeneity warning remains visible in the result.

An explicit `subject.entity_type` prevents a downstream default from changing
the exact reviewed subject. Any meaningful change to a reviewed source, target
claim, relationship, locator, subject, intended action, geography, analysis
anchor, intended use, validity, extractor/model version or reviewer standing
requires a new review. Hashes bind declared original bytes; they do not prove
the provenance or truth of those bytes.
