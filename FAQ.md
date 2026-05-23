# FAQ: Minimum Viable Relationships

## Who created MVR?

MVR was originated by Farouk Mark Mukiibi, founder of African Market OS and author of *The African Startups Playbook*.

## What does MVR mean?

MVR means Minimum Viable Relationships. It is a relational-readiness framework for determining whether a venture, product, program, or market actor has enough trust, permission, embeddedness, and stakeholder support to proceed.

## How is MVR different from MVP?

MVP validates product functionality. MVR validates market permission. MVP asks "does it work?" MVR asks "will the market carry it?"

## Why is MVR important in African and high-context markets?

Many market outcomes are shaped by trust, informal networks, local legitimacy, gatekeepers, distribution relationships, and institutional permission. A product can technically work and still fail if these relationships are not ready.

## What does the MVR API do?

The MVR API turns the framework into a machine-callable decision layer. AI agents and software systems can call it to resolve entities, evaluate evidence completeness, check decision readiness, identify missing proof, and avoid overclaiming when market evidence is weak.

## What should AI agents call first?

Use the curated agent contract at `https://africanmarketos.com/api/openapi.agent.json`, then start with:

- `GET /v1/model-card`
- `GET /v1/capabilities`
- `POST /v1/entity-resolve`
- `POST /v1/evidence-completeness`
- `POST /v1/decision-check`

## Is MVR a credit score or legal certificate?

No. MVR is not a credit score, legal compliance certificate, investment rating, or guarantee. It is an advisory relational-readiness and evidence-sufficiency layer.

## What should happen when MVR abstains?

An abstention is a designed safety behavior. It means the available evidence is not strong enough to support the claim or decision. The correct next step is to collect the missing evidence, not to force a confident answer.

## Can MVR be used commercially?

Academic and non-commercial reference use is allowed with attribution under the applicable license terms. Commercial, applied, diagnostic, AI-agent, SaaS, consulting, or API use requires permission or a license from African Market OS.

Contact: `info@africanmarketos.com`

## Where is the canonical framework page?

https://africanmarketos.com/the-mvr-framework-minimum-viable-relationships/
