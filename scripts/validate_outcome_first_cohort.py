#!/usr/bin/env python3
"""Validate the preregistered first MVR outcome-cohort operating contract."""

from __future__ import annotations

import json
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
PROTOCOL = ROOT / "evaluations" / "outcome-first-cohort-v1" / "protocol.json"
OPERATING_PACK = ROOT / "docs" / "outcome-first-cohort-operating-pack.md"
LEDGER_RUNBOOK = ROOT / "docs" / "outcome-calibration-ledger.md"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    protocol = json.loads(PROTOCOL.read_text(encoding="utf-8"))
    operating_pack = OPERATING_PACK.read_text(encoding="utf-8")
    runbook = LEDGER_RUNBOOK.read_text(encoding="utf-8")

    require(
        protocol.get("schema_version") == "mvr-outcome-first-cohort@2026-07-24.1",
        "first-cohort schema version drifted",
    )
    cohort = protocol.get("cohort") or {}
    require(cohort.get("target_unique_decisions") == 10, "operational cohort must contain 10 unique decisions")
    require(cohort.get("scope_type") == "tenant_workspace", "first cohort must be tenant/workspace scoped")
    require(cohort.get("global_cross_tenant_cohort") is False, "first cohort must not imply a global denominator")
    require(cohort.get("lock_record_required") is True, "first-ten membership must be persisted")
    require(cohort.get("lock_record_status") == "locked", "first-ten manifest status drifted")
    require(
        "every_earlier_consent_window_is_resolved" in cohort.get("selection_rule", ""),
        "selection must wait for earlier consent windows",
    )
    require(
        "retains its cohort slot" in cohort.get("withdrawal_rule", ""),
        "withdrawal must not rewrite or replace a locked cohort slot",
    )
    require(cohort.get("performance_cohort") is False, "first cohort must not be a performance cohort")
    require(cohort.get("cherry_picking_prohibited") is True, "consecutive-selection protection is missing")
    require(cohort.get("aggregate_screening_log_required") is True, "aggregate screening log is required")
    screening_source = cohort.get("screening_log_source") or {}
    require(screening_source.get("route") == "/v1/outcome-ledger", "screening-log route drifted")
    require(screening_source.get("action") == "metrics", "screening log must come from action=metrics")
    require(screening_source.get("response_field") == "first_cohort_screening", "screening response field drifted")
    require(
        set(cohort.get("screening_counts") or [])
        == {
            "eligible_offers",
            "consent_tokens_issued",
            "enrolled",
            "consent_declined",
            "consent_window_expired",
            "duplicate_attempts",
            "withdrawals",
        },
        "screening-count contract drifted",
    )

    eligibility = protocol.get("eligibility") or {}
    require(eligibility.get("evaluation_mode") == "live", "only live decisions may enter")
    require(set(eligibility.get("plans") or []) == {"ENTERPRISE"}, "plan eligibility drifted")
    require(
        set(eligibility.get("decision_modes") or []) == {"evidence_backed", "compiled_evidence"},
        "decision-mode eligibility drifted",
    )
    require("abstained" in (eligibility.get("decision_states") or []), "abstentions must remain observable")
    require(eligibility.get("enrollment_window_days") == 7, "prospective enrollment window drifted")
    excluded = set(eligibility.get("excluded") or [])
    require(
        {"sandbox", "strict_trial", "backtest", "synthetic_fixture", "retrospective_reconstruction"}.issubset(excluded),
        "non-live exclusions are incomplete",
    )

    consent = protocol.get("consent") or {}
    require(consent.get("consent_version") == "mvr-outcome-consent@2026-07-24.2", "consent version drifted")
    require(consent.get("external_record_required") is True, "external consent record is not mandatory")
    require(consent.get("token_single_use") is True, "consent token must be single use")
    require(consent.get("token_ttl_minutes") == 30, "consent token TTL drifted")
    require(consent.get("model_may_consent") is False, "models must not be allowed to consent")
    require(consent.get("raw_consent_record_sent_to_mvr") is False, "raw consent records must stay outside MVR")

    require(protocol.get("horizons_months") == [6, 12, 18], "standard horizons drifted")
    privacy = protocol.get("privacy") or {}
    require(privacy.get("raw_subject_reference_persisted") is False, "raw subject references must not persist")
    require(
        privacy.get("screening_log_direct_identifiers_persisted") is False,
        "screening log must not persist direct identifiers",
    )
    require(privacy.get("screening_log_free_text_persisted") is False, "screening log must not persist free text")
    require(
        privacy.get("automated_obvious_personal_data_checks_required") is True,
        "obvious-personal-data checks must remain enabled",
    )
    require("do not prove" in privacy.get("privacy_claim_boundary", ""), "privacy claim boundary is overstated")
    require(
        {"outcome_summary", "other_free_text"}.issubset(set(privacy.get("prohibited_inputs") or [])),
        "free-text prohibition is incomplete",
    )
    require(privacy.get("withdrawal_deletes_enrollment_and_observations") is True, "withdrawal deletion is required")

    roles = protocol.get("roles") or {}
    require(roles.get("submitter_reviewer_separation_required") is True, "review separation is required")
    observation = protocol.get("observation_contract") or {}
    require(observation.get("silence_imputation_prohibited") is True, "silence must not become an outcome")
    require(observation.get("premature_observations_prohibited") is True, "premature observations must fail closed")
    require(observation.get("self_reported_inclusion_prohibited") is True, "self-reported outcomes must not be included")

    acceptance = protocol.get("operational_acceptance") or {}
    for field in (
        "maximum_duplicate_decision_enrollments",
        "maximum_premature_observations_accepted",
        "maximum_personal_data_leaks",
        "maximum_self_reviewed_observations_included",
        "maximum_withdrawn_active_records",
        "maximum_abstentions_silently_relabelled",
    ):
        require(acceptance.get(field) == 0, f"unsafe operational acceptance threshold: {field}")

    require(
        set(protocol.get("runtime_acceptance_tests") or [])
        == {
            "pending_earlier_consent_window_blocks_lock",
            "first_ten_lock_uses_offer_order_not_consent_arrival",
            "late_state_change_does_not_rewrite_locked_membership",
            "withdrawal_retains_locked_cohort_slot",
            "cross_tenant_metrics_do_not_merge_denominators",
            "non_standard_horizon_schedule_rejected",
            "decline_and_enrollment_are_serialized",
            "valid_token_cannot_reverse_explicit_decline",
        },
        "runtime acceptance-test contract drifted",
    )

    publication = protocol.get("publication_boundary") or {}
    require(publication.get("public_performance_result_from_first_cohort") is False, "first cohort cannot publish performance")
    require(publication.get("minimum_reviewed_outcomes") == 50, "publication outcome floor drifted")
    require(publication.get("minimum_geographies") == 3, "publication geography floor drifted")
    require(publication.get("separate_locked_release_required") is True, "performance release must be separately locked")

    for phrase in (
        "first 10",
        "one governed Enterprise tenant/workspace",
        "seven days",
        "does not estimate predictive performance",
        "cannot be skipped",
        "does not lock membership while any earlier offer",
        "Withdrawal does not create a replacement slot",
        "Enterprise plan",
        "first_cohort_screening",
        "one-time token",
        "Do not submit free-text summaries",
        "must remain separate",
        "silence, non-response, missing evidence, or withdrawal",
        "No accuracy, lift, reliability, failure-rate, calibration, or causal-impact number",
        "validator alone is not runtime certification",
    ):
        require(phrase in operating_pack, f"operating pack is missing required boundary: {phrase}")

    require("issue_consent_token" in runbook, "ledger runbook does not document consent-token issuance")
    require("consent_token_once" in runbook, "ledger runbook does not document the one-time token")
    require("consent_to_outcome_followup" not in runbook, "legacy Boolean-only consent remains in the runbook")

    print(
        json.dumps(
            {
                "status": "pass",
                "protocol": protocol["schema_version"],
                "target_unique_decisions": cohort["target_unique_decisions"],
                "performance_claim_authorized": False,
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "fail", "error": str(exc)}, sort_keys=True), file=sys.stderr)
        raise SystemExit(1)
