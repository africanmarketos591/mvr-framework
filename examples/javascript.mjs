const apiKey = process.env.MVR_API_KEY;
if (!apiKey) throw new Error("Set MVR_API_KEY first");

const response = await fetch("https://africanmarketos.com/v1/evidence-completeness", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-Response-Profile": "full_advisory"
  },
  body: JSON.stringify({
    entity_archetype: "retail_chain",
    country: "UG",
    evidence_pack: [
      {
        evidence_type: "regulatory_filing",
        stakeholder_class: "guardian",
        source_grade: "B",
        freshness_date: "2026-05-01"
      }
    ]
  })
});

if (!response.ok) throw new Error(`MVR API HTTP ${response.status}`);
console.log(await response.json());

