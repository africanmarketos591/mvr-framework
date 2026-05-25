# Agent Recipes

These recipes turn MVR from a broad API into concrete tool-calling patterns that buyers and developers understand.

Each recipe uses the same safe progression:

1. `entity-resolve`
2. `evidence-completeness`
3. `context/compile` where context is mixed or informal
4. `decision-check`
5. abstain or ask for missing proof when evidence is weak

Use the public sandbox for evaluation only. Production and commercial use require authorization from African Market OS.

All recipes share the same boundary: public sandbox output is non-commercial, advisory, illustrative, and not for production. Commercial use requires a licensed key from African Market OS.

## Shared Input Shape

```json
{
  "company_name": "string",
  "country": "UG | KE | NG | ZA | GH | ...",
  "sector": "fintech | fmcg | health | agritech | education | retail | ngo | logistics | energy",
  "stage": "idea | pilot | seed | scaling | enterprise",
  "target_users": "string",
  "known_partners": ["string"],
  "evidence_available": ["interviews", "surveys", "field_observation", "sales_data", "licence", "transaction_logs"]
}
```

## 1. VC Due Diligence

Problem: A venture team needs to know whether traction claims are backed by local permission and stakeholder evidence.

When to call MVR: Before writing the investment memo or asking the founder for follow-up diligence.

Input:

```json
{
  "company_name": "Merchant FloatCo",
  "country": "UG",
  "sector": "fintech",
  "stage": "seed",
  "target_users": "informal merchants",
  "known_partners": ["mobile-money agents"],
  "evidence_available": ["interviews", "sales_data"]
}
```

Output to expect: evidence gaps, guardian risk, permission status, safe claims, unsafe claims, and next evidence requests.

Commercial upgrade: verified evidence pack, strict calibrated profile, board-safe diligence memo.

## 2. Accelerator Selection

Problem: A cohort manager needs to screen many applicants without rewarding polished but unsupported claims.

When to call MVR: After application intake, before interviews or cohort selection.

Commercial upgrade: batch screening, cohort dashboard, exportable readiness summaries.

## 3. Market-Entry Agents

Problem: An expansion agent must not recommend launch based only on TAM, CAC, or generic market attractiveness.

When to call MVR: Before advising entry, MVP build, paid acquisition, or distributor signing.

Commercial upgrade: country playbooks, partner-risk review, market-permission memo.

## 4. NGO Program Readiness

Problem: A program design agent needs to assess whether communities, implementing partners, and local authorities are ready for a program.

When to call MVR: Before program launch, grant proposal, or implementation partner selection.

Commercial upgrade: stakeholder evidence review, abstention-safe program memo, monitoring pack.

## 5. Fintech Expansion

Problem: A fintech wants to enter a market where regulation, agent networks, and informal trust anchors matter.

When to call MVR: Before product launch, licence assumption, credit-product deployment, or agent-network expansion.

Commercial upgrade: guardian risk scan, regulatory evidence pack, field verification workflow.

## 6. FMCG Distribution

Problem: A brand wants to know whether a distributor or route-to-market plan is locally viable.

When to call MVR: Before signing distributors, extending credit, or scaling channel incentives.

Commercial upgrade: channel permission memo, supply-route resilience pack, relational debt scan.

## 7. Healthtech Trust Mapping

Problem: A health product requires trust from patients, clinicians, regulators, and community gatekeepers.

When to call MVR: Before clinical pilots, facility partnerships, or patient-acquisition campaigns.

Commercial upgrade: stakeholder coverage review, privacy-risk review, human approval workflow.

## 8. Agritech Adoption

Problem: Farmer adoption depends on seasons, cooperatives, local buyers, input suppliers, and trusted intermediaries.

When to call MVR: Before field pilots, extension-agent deployment, or subsidy-backed growth.

Commercial upgrade: seasonal readiness review, cooperative signal pack, adoption-risk memo.

## 9. Public-Sector Innovation

Problem: A civic or government innovation may fail if permission, procurement, field reality, or institutional guardians are misread.

When to call MVR: Before pilots, procurement bids, policy rollouts, or DFI funding submissions.

Commercial upgrade: governance crosswalk, release memo, evidence certificate.

## 10. Diaspora Ventures

Problem: Diaspora founders often know the opportunity but underestimate local operating permission and trust channels.

When to call MVR: Before hiring, importing goods, signing local partners, or launching in-country.

Commercial upgrade: local partner readiness review, field mission plan, market context memo.

## 11. AI Consulting Agents

Problem: AI consultants need a reliable external judgement layer for high-stakes emerging-market advice.

When to call MVR: Before final recommendations in consulting deliverables or agentic workflows.

Commercial upgrade: licensed API key, usage terms, client-safe reports, integration support.

## 12. Board / Investment Memos

Problem: A memo may overclaim readiness if it treats sentiment, field notes, or thin evidence as fact.

When to call MVR: Before memo release, board circulation, or public claims.

Commercial upgrade: report pack, evidence manifest, release certificate, amendment workflow.
