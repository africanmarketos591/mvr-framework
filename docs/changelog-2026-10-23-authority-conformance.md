# Authority conformance — 23 October 2026

The licensed MCP runtime adds `mvr_authority_operation` alongside its five analysis tools. Authority and review operations always read current state and use action-specific operation IDs. The governed catalogue includes authority, review, receipt verification and executor job routes.

The public [conformance package](../conformance/authority/README.md) contains document/request/receipt schemas, canonical signed lab examples, negative fixtures and an unchanged production runner requiring no operator credentials. Four disposable lab principals can build a narrowly scoped harmless chain and test exact-effect denials, immediate dependency revocation, contradiction and withdrawal.

Authority verification, revocation and effect results now include the complete receipt body. A [public and offline verifier](authority-receipts.md) checks hashes, signatures and optional chain links. Disposable sessions use ephemeral lab keys. Operational signing remains disabled pending the named-person ceremony.

The [durable executor wrapper](durable-authority-executor.md) persists intent and outcomes, retries report delivery with stable IDs, and requires reconciliation for unknown effects. The lab runner also exercises the production notification outbox against an AMOS-owned receiver, including failed delivery, lost acknowledgement, signature checks, deduplication and missed-notification reconciliation.

All examples and automated runs are AMOS lab verification. They do not establish independent standing, real-world source authenticity, production execution authority or a service availability guarantee. Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.
