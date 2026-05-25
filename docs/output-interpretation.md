# MVR Output Interpretation

Agents should read MVR outputs as evidence-bounded advisory signals, not as permission to execute.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `permission_not_yet_earned` | Do not launch or scale. Relationship conditions are insufficient. |
| `pilot_only` | Test with limited scope, strong safeguards, and fresh evidence collection. |
| `pilot_ready` | A controlled pilot may be considered subject to evidence and human review. |
| `ready_to_scale` | Expansion may be considered only when verified evidence and authorization support it. |

## Fields To Read Before Summarizing

- `decision_reliability`
- `execution_authorization_state`
- `confidence_ceiling`
- `evidence_gaps`
- `not_safe_to_claim`
- `reconciled_assessment`
- `evidence_recruitment_plan`
- `response_meta.environment`
- `response_meta.not_for_production`

## Abstention

If MVR abstains, do not call it a failure. Say the evidence is insufficient and list the minimum missing proof.

## Safe Language

Use:

- "MVR indicates..."
- "MVR advises..."
- "The submitted evidence is insufficient for..."
- "The safest next action is..."

Avoid:

- "MVR proves..."
- "MVR certifies..."
- "MVR guarantees..."
- "MVR approves..."
