# Repository Rights Map

This document explains which rights attach to which public resources. It is a scope map, not a replacement for the controlling license text in `LICENSE` or a more specific file.

| Resource | Controlling terms | What the grant does not include |
| --- | --- | --- |
| Public MVR framework text, citation metadata, and non-code documentation | CC BY 4.0, unless a resource states otherwise | Hosted API access, private scoring, calibration, private labels, trademarks, or production services |
| `packages/mvr-mcp-bridge/**` | Apache License 2.0 | MVR computation, calibration, credentials, service entitlement, or private data |
| `examples/**` | Apache License 2.0 | Any authorization to use the hosted service outside its applicable access terms |
| `reference-agents/**` | Apache License 2.0 | A production verdict, certification, or right to reproduce the protected engine |
| `integrations/n8n/**` | Apache License 2.0 | Production API access or a right to bypass quotas, billing, or safety controls |
| `integrations/openai/**` | Apache License 2.0 | OpenAI endorsement, directory acceptance, hosted-service access, private computation, or calibration rights |
| `plugins/anthropic-mvr-preflight/**` | Apache License 2.0 | Anthropic endorsement or verification, hosted-service access, private computation, calibration, or brand rights |
| `benchmarks/mvr-bench/**` | `benchmarks/mvr-bench/LICENSE.md` | Private test labels, private answer keys, server-side scoring, or production API rights |
| `packages/mvr-agent-sdk/npm/**` | `packages/mvr-agent-sdk/npm/LICENSE.md` | Hosted API entitlement or private engine rights |
| `packages/mvr-agent-sdk/python/**` | `packages/mvr-agent-sdk/python/LICENSE.md` | Hosted API entitlement or private engine rights |
| Third-party dependencies and vendored material | Their attached upstream terms | Rights the upstream owner did not grant |
| Trademarks, logos, badges, and certification language | `TRADEMARKS.md` | Endorsement, official status, or confusingly similar branding |
| Worker/API source, scoring algorithms, calibration assets, private labels, private datasets, outcome records, customer evidence, credentials, tenant configuration, and production infrastructure | Proprietary; no public repository grant | Any copying, access, extraction, publication, training, reverse engineering, or competing service right |

## Rules of interpretation

1. A specific file or directory license overrides this general map for that resource.
2. Existing CC BY 4.0 publications keep their original grant; later policy text does not retract it.
3. A content or code license does not create an account, API key, subscription, quota, support commitment, certification, or authorization to make regulated decisions.
4. Public interoperability metadata may be fetched, indexed, quoted, and cited under its attached notice. It must not be treated as a publication of the protected runtime.
5. Where no express permission appears, rights are reserved rather than inferred from public visibility.

## Future benchmark versions

The existing MVR-Bench v1 public materials remain under the license attached to those copies. Any future benchmark evaluation license must be prospective, versioned, and reviewed before publication. It should distinguish permitted evaluation and adapter development from prohibited training, resale, private-label reconstruction, or substitution for the licensed MVR service.

## Contact

Licensing and permissions: `info@africanmarketos.com`
