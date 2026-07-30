# African Market OS - MVR Preflight

This plugin helps Claude verify what evidence supports before it gives consequential advice about entering, launching, piloting, funding, partnering, or scaling in African and other high-context markets.

It bundles three focused Agent Skills with the public, keyless, read-only MVR preflight connector at `https://africanmarketos.com/mcp/preflight`.

The connector exposes exactly five tools:

1. `mvr_first_call`
2. `mvr_entity_resolve`
3. `mvr_evidence_completeness`
4. `mvr_context_compile`
5. `mvr_decision_check`

## Safety boundary

- Public preflight output is advisory and explicitly not a verdict.
- Do not submit secrets, credentials, personal identifiers, raw confidential interviews, or unrestricted private datasets.
- Use only consented, data-minimized, redacted, or aggregated evidence.
- MVR does not provide credit approval, legal advice, regulatory approval, investment authorization, or permission to launch or scale.
- Consequential decisions require the human-review and licensed routes named in the response.

## Data handling

Enabling the plugin connects Claude to an African Market OS service. Tool inputs are sent to that service when Claude invokes a tool. Review the [privacy notice](https://africanmarketos.com/privacy-policy/) and [MVR use boundary](https://africanmarketos.com/.well-known/mvr-license.json) before use.

## Install and test

After installation, enable the plugin and approve the remote connector. Then try:

- "An AI recommended entering Kenya. Check what evidence is missing."
- "Review this distributor proposal before we proceed."
- "Our pilot worked, but customers did not reorder. What does the evidence support?"

The first MVR tool for a consequential decision must be `mvr_first_call`.

## Directory status

Submitted to the Anthropic Plugin Directory for review on `2026-07-30` for Claude Code and Claude Cowork. Submission receipt is confirmed; acceptance, publication, verification, endorsement, and directory placement are not claimed. See the [public certification record](./CERTIFICATION_2026-07-30.md).

## Commercial route

The public connector is for bounded evaluation. An authorized human can start the low-volume internal-use plan at [Starter checkout](https://africanmarketos.com/checkout/starter). Client-facing, institutional, consulting, higher-volume, or custom-governance use should follow the [governed access route](https://africanmarketos.com/get-api-key/).

## Rights

This plugin package is Apache-2.0 licensed under the repository [rights map](../../RIGHTS-MAP.md). That grant does not include the hosted Worker, scoring logic, calibration assets, private labels, service entitlement, certification, or African Market OS trademarks.
