# MVR Interoperability Standards

This directory contains open, implementation-neutral schemas that make MVR
outputs easier for agents and external systems to exchange.

These schemas are not the private MVR Core scoring engine. They describe safe
data envelopes for provenance, auditability, and tool chaining.

## Schemas

- `mvr-provenance-ledger.schema.json`: evidence provenance and dependency envelope
  for MVR evidence items, document extracts, telemetry summaries, and field notes.
  Different publishers or source labels do not prove independence; use the
  upstream event, dataset, method, instrument, collector, and error-process fields.
