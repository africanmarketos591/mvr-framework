// Generated from the AMOS OpenAPI contract (https://africanmarketos.com/v1/openapi.json) by scripts/generate-governance-client.mjs.
// Contract subset SHA-256: 58452d8727a538c5abd97488de396257ccbc378a29ececb8f81fd491bb1baec0. Do not edit by hand; regenerate instead.
/** Request body for POST /v1/review-cases. */
export type ReviewCasesRequest = {
  workplan_id?: string;
  plan_kind?: "internal_pilot_design" | "evidence_collection_design";
  expected_plan_revision?: number;
  internal_only_acknowledged?: true;
  step_id?: "scope_and_hypothesis" | "measures_and_limits" | "source_and_permission_plan" | "privacy_and_consent_plan" | "human_review_and_release_plan";
  step_text?: string;
  original_document?: {
    name: string;
    text?: string;
    content_base64?: string;
    provenance: "proprietary_generated_test_data" | "public_source" | "owner_supplied";
    source_url?: string;
  };
  clause_review?: {
    document_sha256: string;
    fact_id: string;
    start: number;
    end: number;
    clause_text: string;
    disposition: "approve" | "reject" | "qualify";
    note: string;
  };
  passage_interpretation?: {
    document_sha256: string;
    fact_id: string;
    start: number;
    end: number;
    clause_text: string;
    stance: "adverse" | "supports" | "unrelated";
    source: "human" | "model";
    model_ref?: string;
    note?: string;
  };
  register_lei?: string;
  register_query?: {
    adapter: "gleif-lei/1" | "gleif-parent/1" | "ror-org/1" | "crossref-doi/1" | "worldbank-project/1" | "eu-vies-vat/1" | "sec-edgar/1";
    id: string;
    expected_name?: string;
  };
  expected_tools_revision?: number;
  review_model?: {
    [key: string]: unknown;
  };
  review_observation?: {
    fact_id: string;
    value: boolean;
  };
  hold_event?: {
    id: string;
    type: string;
    blocker?: string;
    closure_artifact?: string;
    owner_ref?: string;
    deadline?: string;
    deadline_commitment_ref?: string;
    evidence_ref?: string;
    reason?: string;
  };
  proposal_text?: string;
  proposal_model_ref?: string;
  case_outcome?: {
    outcome: "proceeded_no_incident" | "proceeded_incident" | "held_then_cleared" | "held_prevented_harm" | "held_unnecessary" | "abandoned";
    observed_at: string;
    evidence_ref?: string;
    reviewer_minutes?: number;
    integration_minutes?: number;
    reviewer_cost_per_hour_minor?: number;
    currency?: string;
    note?: string;
  };
  action: "create" | "get" | "link_attestation" | "unlink_attestation" | "prepare_packet" | "get_packet" | "withdraw" | "open_workplan" | "get_workplan" | "record_plan_step" | "finalize_workplan" | "lookup_public_register" | "register_review_document" | "review_document_clause" | "record_passage_interpretation" | "get_review_tools" | "set_review_model" | "record_review_observation" | "record_hold_event" | "capture_review_proposal" | "compare_review_decision" | "record_case_outcome" | "get_review_outcome_ledger";
  operation_id?: string;
  case_id?: string;
  expected_revision?: number;
  preflight_context?: {
    subject: {
      entity_name?: string;
      entity_id?: string;
      entity_archetype?: string;
      [key: string]: unknown;
    };
    market_scope: {
      country: string;
      [key: string]: unknown;
    };
    decision_question: string;
    [key: string]: unknown;
  };
  notes?: Array<{
      text: string;
      source_ref?: string;
      observed_at?: string;
      country?: string;
    }>;
  risk_codes?: Array<"SOURCE_RECORD_REVIEW_MISSING" | "SOURCE_AUTHENTICITY_UNVERIFIED" | "CLAIM_TRUTH_UNVERIFIED" | "ATTESTOR_STANDING_UNVERIFIED" | "DECISION_SCOPE_UNVERIFIED" | "MISSING_GUARDIAN_PERMISSION" | "PERMISSION_STATUS_UNASSESSED" | "UNVERIFIED_REPAYMENT_CAPACITY" | "WRONG_GEOGRAPHY_TRANSFER" | "INCOMPLETE_STUDY_INVENTORY" | "REVIEW_CONTRADICTION" | "REVIEW_DEPENDENCY_INACTIVE" | "EVIDENCE_REQUIRED" | "SOURCE_METADATA_INCOMPLETE" | "STAKEHOLDER_COVERAGE_INCOMPLETE" | "DECISION_CONTEXT_INCOMPLETE" | "EVIDENCE_INPUT_INVALID" | "EVIDENCE_FRESHNESS_UNRESOLVED" | "CLAIM_LINKAGE_UNRESOLVED" | "EVIDENCE_FIT_UNRESOLVED" | "UNCLASSIFIED_RESIDUAL_RISK">;
  reference_secret?: string;
  share_redacted_with_reference_holders?: true;
  redacted_no_personal_data?: true;
  attestation_ref?: {
    attestation_id: string;
    tenant_id: string;
    workspace_id: string;
    reference_secret: string;
  };
  attestation_id?: string;
  reason?: string;
  packet_id?: string;
};

/** Response body for POST /v1/review-cases. */
export type ReviewCasesResponse = ReviewCaseResponse;

/** Response body for GET /v1/review-cases/contract. */
export type ReviewCasesContractResponse = ReviewCaseContract;

/** Request body for POST /v1/review-sandbox. */
export type ReviewSandboxRequest = ({
    action: "issue";
    synthetic_only: true;
    acknowledge_no_identity_verification: true;
  } | {
    action: "call";
    session_id: string;
    session_token: string;
    target: "attestation" | "case";
    request: {
      [key: string]: unknown;
    };
  } | {
    action: "close";
    session_id: string;
    session_token: string;
  });

/** Response body for POST /v1/review-sandbox. */
export type ReviewSandboxResponse = ReviewSandboxResponse;

/** Response body for GET /v1/review-sandbox/contract. */
export type ReviewSandboxContractResponse = ReviewSandboxContract;

/** Request body for POST /v1/authority-chain. */
export type AuthorityChainRequest = {
  action: "register_anchor" | "revoke_anchor" | "vet_anchor" | "register_credential" | "revoke_credential" | "register_source_record" | "register_issuer_state" | "revoke_source_record" | "close_residual" | "revoke_closure" | "register_capability" | "revoke_capability" | "verify_capability" | "commit_effect" | "record_effect" | "get" | "trace" | "check_permission";
  operation_id?: string;
  anchor?: {
    type: "mvr.authority-anchor/1";
    anchor_id: string;
    anchor_role: "institution_authority" | "standing_issuer" | "source_issuer";
    organization_ref: string;
    organization_name_declared: string;
    public_key_spki_b64: string;
    jurisdictions: Array<string>;
    provenance: "lab_fixture" | "institution_key_ceremony";
    ceremony_record_sha256?: string;
    not_before: string;
    not_after: string;
  };
  possession_signature_b64?: string;
  document?: ({
      type: "mvr.reviewer-standing/1";
      credential_id: string;
      issuer_anchor_id: string;
      subject_principal_sha256: string;
      reviewer_display_name: string;
      organization_ref: string;
      role_title: string;
      competence: {
        residual_codes: Array<"SOURCE_AUTHENTICITY_UNVERIFIED" | "CLAIM_TRUTH_UNVERIFIED" | "PERMISSION_STATUS_UNASSESSED" | "MISSING_GUARDIAN_PERMISSION" | "UNVERIFIED_REPAYMENT_CAPACITY" | "WRONG_GEOGRAPHY_TRANSFER" | "INCOMPLETE_STUDY_INVENTORY" | "ATTESTOR_STANDING_UNVERIFIED" | "DECISION_SCOPE_UNVERIFIED" | "UNCLASSIFIED_RESIDUAL_RISK">;
        jurisdictions: Array<string>;
      };
      independence: {
        relationship_to_subject: "none" | "employee" | "contractor" | "shareholder" | "family" | "adviser" | "other";
        conflicts_declared: Array<string>;
        declared_at: string;
      };
      delegation: {
        mode: "issuer_direct" | "delegated";
        delegated_from_credential_id?: string;
        max_further_delegation: number;
      };
      not_before: string;
      not_after: string;
      reviewer_public_key_spki_b64?: string;
    } | {
      type: "mvr.source-authentication/1";
      record_id: string;
      issuer_anchor_id: string;
      record_kind: "source_authenticity" | "registry_extract" | "permission_record" | "observation_record" | "financial_record" | "custodian_inventory";
      source_doc_id: string;
      source_sha256: string;
      jurisdiction: string;
      statement: string;
      valid_from: string;
      valid_until: string;
    } | {
      type: "mvr.action-capability/1";
      capability_id: string;
      issuer_anchor_id: string;
      tenant_id: string;
      workspace_id: string;
      case_id: string;
      basis: {
        required_closures: Array<{
            residual_code: "SOURCE_AUTHENTICITY_UNVERIFIED" | "CLAIM_TRUTH_UNVERIFIED" | "PERMISSION_STATUS_UNASSESSED" | "MISSING_GUARDIAN_PERMISSION" | "UNVERIFIED_REPAYMENT_CAPACITY" | "WRONG_GEOGRAPHY_TRANSFER" | "INCOMPLETE_STUDY_INVENTORY" | "ATTESTOR_STANDING_UNVERIFIED" | "DECISION_SCOPE_UNVERIFIED" | "UNCLASSIFIED_RESIDUAL_RISK";
            closure_id: string;
          }>;
        accepted_open_residuals: Array<string>;
        minimum_closure_assurance: "lab_fixture" | "tenant_declared" | "independent_authenticated";
      };
      actor: {
        executor_principal_sha256: string;
      };
      action: {
        effect_type: "amos.document.draft.create@1" | "amos.communication.evidence.request@1" | "amos.calendar.meeting.create@1" | "amos.communication.counterparty.contact@1" | "amos.document.publish@1" | "amos.finance.spend.commit@1" | "amos.owner_lab.artifact.create@1" | "amos.procurement.order.issue@1" | "amos.finance.payment.initiate@1" | "amos.credit.application.approve@1" | "amos.distribution.product.release@1" | "amos.programme.participant.enrol@1" | "amos.data.record.disclose@1" | "amos.licence.permission.grant@1" | "amos.licence.permission.revoke@1" | "create_draft_record" | "send_evidence_request" | "schedule_meeting" | "contact_counterparty" | "publish_document" | "commit_spend";
        resource_scope: {
          system: string;
          resource_type: string;
          resource_id?: string;
          resource_id_prefix?: string;
        };
        amount_minor?: number;
        max_amount_minor: number;
        currency: string;
        max_uses: number;
        external_contact_allowed: boolean;
        counterparty_ref?: string;
      };
      human_authorization: {
        approver_ref_sha256: string;
        approved_at: string;
        method: "institution_signature" | "dual_control_signature";
      };
      not_before: string;
      not_after: string;
    });
  signature_b64?: string;
  revocation?: {
    type: "mvr.revocation/1";
    target_kind: "credential" | "source_record" | "capability";
    target_id: string;
    revoked_at: string;
    reason: string;
  };
  revocation_signature_b64?: string;
  reason?: string;
  target_tenant_id?: string;
  target_workspace_id?: string;
  anchor_id?: string;
  vetting_basis?: string;
  case_id?: string;
  residual_code?: string;
  scope_ref?: string;
  credential_id?: string;
  source_record_ids?: Array<string>;
  statement?: string;
  expires_at?: string;
  closure_id?: string;
  capability_id?: string;
  requested_effect?: {
    effect_id: string;
    effect_type: "amos.document.draft.create@1" | "amos.communication.evidence.request@1" | "amos.calendar.meeting.create@1" | "amos.communication.counterparty.contact@1" | "amos.document.publish@1" | "amos.finance.spend.commit@1" | "amos.owner_lab.artifact.create@1" | "amos.procurement.order.issue@1" | "amos.finance.payment.initiate@1" | "amos.credit.application.approve@1" | "amos.distribution.product.release@1" | "amos.programme.participant.enrol@1" | "amos.data.record.disclose@1" | "amos.licence.permission.grant@1" | "amos.licence.permission.revoke@1" | "create_draft_record" | "send_evidence_request" | "schedule_meeting" | "contact_counterparty" | "publish_document" | "commit_spend";
    resource: {
      system?: string;
      resource_type?: string;
      resource_id?: string;
    };
    amount_minor: number;
    currency: string;
    external_contact?: boolean;
    counterparty_ref?: string;
  };
  verification_id?: string;
  effect_id?: string;
  outcome?: "succeeded" | "failed" | "not_attempted";
  external_ref_sha256?: string;
  kind?: "anchor" | "credential" | "source_record" | "closure" | "capability_status";
  id?: string;
  geography?: string;
};

/** Response body for POST /v1/authority-chain. */
export type AuthorityChainResponse = AuthorityChainResponse;

/** Response body for GET /v1/authority-chain/contract. */
export type AuthorityChainContractResponse = AuthorityChainContract;

/** Request body for POST /v1/authority-receipts/verify. */
export type AuthorityReceiptsVerifyRequest = {
  receipt: ({
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "capability_verification";
      verification_id: string;
      capability_id: string;
      case_id: string;
      decision: "allow" | "deny";
      deny_reasons: Array<string>;
      effect_id: string;
      requested_effect_sha256: string;
      executor_principal_sha256: string;
      reliance: string;
      valid_until: string;
    } | {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "effect_report";
      verification_id: string;
      capability_id: string;
      effect_id: string;
      outcome: "succeeded" | "failed" | "not_attempted";
      external_ref_sha256: (string | unknown);
      reported_after_valid_until: boolean;
      commit_id?: string;
    } | {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "revocation";
      target_kind: "anchor" | "credential" | "source_record" | "closure" | "capability";
      target_id: string;
      revoked_by_principal_sha256: string;
      operation_id: string;
    } | {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "effect_commit";
      commit_id: string;
      verification_id: string;
      capability_id: string;
      effect_id: string;
      requested_effect_sha256: string;
      decision: "commit" | "deny";
      deny_reasons: Array<string>;
      commit_valid_until: string;
      executor_principal_sha256: string;
    });
  previous_head?: {
    sequence: number;
    sha256: string;
  };
  lab_session_id?: string;
  allow_lab_keys?: boolean;
};

/** Response body for POST /v1/authority-receipts/verify. */
export type AuthorityReceiptsVerifyResponse = AuthorityReceiptVerificationResponse;

/** Request body for POST /v1/reviewer-attestations. */
export type ReviewerAttestationsRequest = {
  action: "create" | "get" | "revoke";
  operation_id?: string;
  attestation_id?: string;
  preflight_context?: {
    subject: {
      [key: string]: unknown;
    };
    market_scope: {
      [key: string]: unknown;
    };
    decision_question: string;
    [key: string]: unknown;
  };
  reviewer_name?: string;
  reviewer_relationship?: "self" | "internal" | "external" | "unknown";
  claim?: string;
  statement?: string;
  relationship?: "supports" | "qualifies" | "contradicts" | "context_only";
  source_records?: Array<{
      source_ref: string;
      locator: string;
      source_sha256?: string;
    }>;
  reviewed_at?: string;
  expires_at?: string;
  residual_gaps?: Array<string>;
  reference_secret?: string;
  share_redacted_with_reference_holders?: true;
  original_records_examined?: true;
  redacted_no_personal_data?: true;
  reason?: string;
};

/** Response body for POST /v1/reviewer-attestations. */
export type ReviewerAttestationsResponse = ReviewerAttestationResponse;

/** Response body for GET /v1/reviewer-attestations/contract. */
export type ReviewerAttestationsContractResponse = ReviewerAttestationContract;

/** Request body for POST /v1/key-ceremony. */
export type KeyCeremonyRequest = {
  action: "precheck" | "run" | "check_token" | "recover_interrupted";
  ceremony_id?: string;
  key_id?: string;
  participants_sha256?: string;
  cloudflare_api_token?: string;
  confirm_witnesses_present?: boolean;
};

/** Response body for POST /v1/key-ceremony. */
export type KeyCeremonyResponse = KeyCeremonyResponse;

/** Response body for GET /v1/key-ceremony/status. */
export type KeyCeremonyStatusResponse = KeyCeremonyStatus;

/** Response body for GET /v1/key-ceremony/contract. */
export type KeyCeremonyContractResponse = KeyCeremonyContract;

export type ReviewCaseResponse = {
  status?: string;
  code?: string;
  case_id?: string;
  revision?: number;
  mode?: "internal_review" | "sandbox_evaluation" | "account_evaluation";
  content?: {
    [key: string]: unknown;
  };
  content_sha256?: string;
  review_progress?: ReviewProgress;
  history?: Array<{
      revision?: number;
      event?: string;
      at?: string;
      [key: string]: unknown;
    }>;
  packet?: {
    document?: {
      [key: string]: unknown;
    };
    sha256?: string;
    basis_sha256?: string;
    valid_until?: string;
    usable?: boolean;
    current_state_checked?: true;
    signature_present?: false;
    integrity_is_not_identity_proof?: true;
    [key: string]: unknown;
  };
  idempotent_replay?: boolean;
  reference_scope?: {
    tenant_id?: string;
    workspace_id?: string;
    [key: string]: unknown;
  };
  reference_secret_returned?: false;
  execution_authorized?: false;
  external_action_authorized?: false;
  workplan?: {
    document?: {
      [key: string]: unknown;
    };
    usable?: boolean;
    current_state_checked?: true;
    missing_steps?: Array<string>;
    invalidation_codes?: Array<string>;
    historical_versions_preserved?: true;
    completed_planning_is_not_business_approval?: true;
    execution_authorized?: false;
    [key: string]: unknown;
  };
  outcome_entry?: {
    contract_version: "mvr.review-outcome-ledger/1";
    sequence: number;
    prev_sha256?: string | null;
    case_id: string;
    case_revision?: number;
    outcome: "proceeded_no_incident" | "proceeded_incident" | "held_then_cleared" | "held_prevented_harm" | "held_unnecessary" | "abandoned";
    observed_at: string;
    recorded_at: string;
    recorded_by?: string;
    evidence_ref?: string;
    reviewer_minutes?: number;
    note?: string;
    amos_state_at_recording: {
      review_status?: string;
      permission_tier?: string | null;
      open_residual_count?: number;
      [key: string]: unknown;
    };
    hold_metrics: {
      holds?: number;
      closed?: number;
      open?: number;
      closed_hold_ms_total?: number;
      [key: string]: unknown;
    };
    proposal?: {
      captured_before_review?: boolean;
      proposal_sha256?: string | null;
      [key: string]: unknown;
    };
    economics: {
      wait_to_first_review_ms?: number | null;
      elapsed_to_outcome_ms: number;
      operations_recorded: number;
      review_actions: number;
      distinct_accounts: number;
      handoffs: number;
      reopenings: number;
      reviewer_minutes?: number | null;
      integration_minutes?: number | null;
      reviewer_cost_per_hour_minor?: number | null;
      currency?: string | null;
      decision_cost_minor?: number | null;
      telemetry_complete: boolean;
      basis?: string;
      [key: string]: unknown;
    };
    declared_not_verified: true;
    causal_claim: false;
    sha256: string;
    [key: string]: unknown;
  };
  review_outcome_ledger?: {
    contract_version: "mvr.review-outcome-ledger/1";
    entry_count: number;
    head_sha256?: string | null;
    metrics: {
      cases_with_outcome: number;
      prevented_bad_approvals?: number;
      unnecessary_holds?: number;
      downstream_incidents?: number;
      clean_proceeds?: number;
      held_then_cleared?: number;
      abandoned?: number;
      hold_precision: {
        value?: number | null;
        n?: number;
        small_sample?: boolean;
        [key: string]: unknown;
      };
      incident_rate_after_proceeding?: {
        value?: number | null;
        n?: number;
        small_sample?: boolean;
        [key: string]: unknown;
      };
      reviewer_minutes_total?: number;
      hold_duration_ms?: {
        median?: number | null;
        p90?: number | null;
        n?: number;
        [key: string]: unknown;
      };
      decision_economics: {
        decisions?: number;
        telemetry_complete?: {
          count?: number;
          ratio?: number | null;
          meets_95_percent?: boolean;
          small_sample?: boolean;
          [key: string]: unknown;
        };
        median_wait_to_first_review_ms?: number | null;
        median_elapsed_to_outcome_ms?: number | null;
        median_operations_recorded?: number | null;
        median_handoffs?: number | null;
        reopenings_total?: number;
        integration_minutes_total?: number;
        cost_per_completed_decision?: {
          [key: string]: {
            median_minor?: number | null;
            total_minor?: number;
            n?: number;
            [key: string]: unknown;
          } | unknown;
        };
        boundary?: string;
        [key: string]: unknown;
      };
      labels: {
        declared_not_verified?: boolean;
        causal_claim?: boolean;
        monetary_value?: string;
        counterfactual?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    recent_entries?: Array<{
        contract_version: "mvr.review-outcome-ledger/1";
        sequence: number;
        prev_sha256?: string | null;
        case_id: string;
        case_revision?: number;
        outcome: "proceeded_no_incident" | "proceeded_incident" | "held_then_cleared" | "held_prevented_harm" | "held_unnecessary" | "abandoned";
        observed_at: string;
        recorded_at: string;
        recorded_by?: string;
        evidence_ref?: string;
        reviewer_minutes?: number;
        note?: string;
        amos_state_at_recording: {
          review_status?: string;
          permission_tier?: string | null;
          open_residual_count?: number;
          [key: string]: unknown;
        };
        hold_metrics: {
          holds?: number;
          closed?: number;
          open?: number;
          closed_hold_ms_total?: number;
          [key: string]: unknown;
        };
        proposal?: {
          captured_before_review?: boolean;
          proposal_sha256?: string | null;
          [key: string]: unknown;
        };
        economics: {
          wait_to_first_review_ms?: number | null;
          elapsed_to_outcome_ms: number;
          operations_recorded: number;
          review_actions: number;
          distinct_accounts: number;
          handoffs: number;
          reopenings: number;
          reviewer_minutes?: number | null;
          integration_minutes?: number | null;
          reviewer_cost_per_hour_minor?: number | null;
          currency?: string | null;
          decision_cost_minor?: number | null;
          telemetry_complete: boolean;
          basis?: string;
          [key: string]: unknown;
        };
        declared_not_verified: true;
        causal_claim: false;
        sha256: string;
        [key: string]: unknown;
      }>;
    definitions?: {
      [key: string]: unknown;
    };
    execution_authorized?: false;
    external_action_authorized?: false;
    [key: string]: unknown;
  };
  review_tools?: {
    contract_version: string;
    revision: number;
    configured: boolean;
    usable?: boolean;
    context_sha256?: string;
    basis_sha256?: string;
    current_basis_sha256?: string;
    review_plan?: {
      status?: string;
      model_outcome?: boolean | null;
      next_review?: string | null;
      referenced_facts?: Array<string>;
      minimum_worst_case_review_cost?: number | null;
      [key: string]: unknown;
    } | null;
    review_coverage?: {
      decisive_total?: number;
      decisive_reviewed?: number;
      pending?: Array<string>;
      not_needed?: Array<string>;
      note?: string;
      [key: string]: unknown;
    } | null;
    review_queue?: Array<{
        fact_id: string;
        reason: string;
        worst_case_remaining_cost?: number;
        decisive_pairs?: number;
        [key: string]: unknown;
      }>;
    fact_values?: {
      [key: string]: {
        value?: boolean;
        basis?: "reviewed_passage" | "reviewer_adverse_interpretation" | "declared_observation" | "conflict";
        fact_truth_asserted?: false;
        passage_review_sha256?: string;
        [key: string]: unknown;
      } | unknown;
    };
    fact_conflicts?: Array<{
        fact_id: string;
        observation_value?: boolean;
        passage_value?: boolean;
        basis?: string;
        resolution?: string;
        [key: string]: unknown;
      }>;
    adverse_findings?: Array<{
        fact_id?: string;
        confirmed_by?: string;
        locator?: string;
        recorded_at?: string;
        interpretation_sha256?: string;
        [key: string]: unknown;
      }>;
    model_suggestions?: Array<{
        fact_id?: string;
        stance?: string;
        model_ref?: string;
        locator?: string;
        decides_nothing?: true;
        [key: string]: unknown;
      }>;
    documents?: Array<{
        [key: string]: unknown;
      }>;
    clause_reviews?: Array<{
        [key: string]: unknown;
      }>;
    passage_interpretations?: Array<{
        [key: string]: unknown;
      }>;
    public_register_snapshots?: Array<{
        [key: string]: unknown;
      }>;
    execution_authorized?: false;
    external_action_authorized?: false;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ReviewCaseContract = {
  contract_version?: "mvr.review-progress/1";
  policy_version?: "internal-review-preparation/2";
  request_schema?: {
    [key: string]: unknown;
  };
  risk_taxonomy?: Array<{
      code?: string;
      category?: string;
      closure?: string;
      description?: string;
      [key: string]: unknown;
    }>;
  internal_planning?: {
    [key: string]: unknown;
  };
  automatic_invalidation?: {
    [key: string]: unknown;
  };
  execution_authorized?: false;
  [key: string]: unknown;
};

export type ReviewSandboxResponse = {
  contract_version?: "mvr.review-sandbox/1";
  status?: string;
  code?: string;
  http_status?: number;
  session_id?: string;
  expires_at?: string;
  credentials?: {
    [key: string]: unknown;
  };
  result?: {
    [key: string]: unknown;
  };
  evaluation_only?: true;
  synthetic?: true;
  identity_verified?: false;
  production_authority?: false;
  execution_authorized?: false;
  [key: string]: unknown;
};

export type ReviewSandboxContract = {
  contract_version?: "mvr.review-sandbox/1";
  request_schema?: {
    [key: string]: unknown;
  };
  evaluation_only?: true;
  identity_verified?: false;
  production_authority?: false;
  execution_authorized?: false;
  [key: string]: unknown;
};

export type AuthorityChainResponse = ({
    action: "register_anchor";
    status: "registered";
    anchor: {
      anchor_id: string;
      anchor_role?: string;
      trust_tier?: string;
      status?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "vet_anchor";
    status: "platform_vetted" | "awaiting_second_operator";
    anchor: {
      anchor_id: string;
      anchor_role?: string;
      trust_tier?: string;
      status?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "revoke_anchor";
    status: "revoked";
    kind: "anchor";
    id: string;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "revocation";
      target_kind: "anchor";
      target_id: string;
      revoked_by_principal_sha256: string;
      operation_id: string;
    };
    [key: string]: unknown;
  } | {
    action: "register_credential";
    status: "registered";
    credential: {
      credential_id: string;
      usable: boolean;
      reasons: Array<string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "register_source_record";
    status: "registered";
    source_record: {
      record_id: string;
      usable: boolean;
      reasons: Array<string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "register_issuer_state";
    status: "registered";
    issuer_state: {
      record_id: string;
      state: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "revoke_credential";
    status: "revoked";
    kind: "credential";
    id: string;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "revocation";
      target_kind: "credential";
      target_id: string;
      revoked_by_principal_sha256: string;
      operation_id: string;
    };
    [key: string]: unknown;
  } | {
    action: "revoke_source_record";
    status: "revoked";
    kind: "source_record";
    id: string;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "revocation";
      target_kind: "source_record";
      target_id: string;
      revoked_by_principal_sha256: string;
      operation_id: string;
    };
    [key: string]: unknown;
  } | {
    action: "close_residual";
    status: "closed";
    closure: {
      closure_id: string;
      usable?: boolean;
      reasons?: Array<string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "revoke_closure";
    status: "revoked";
    kind: "closure";
    id: string;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "revocation";
      target_kind: "closure";
      target_id: string;
      revoked_by_principal_sha256: string;
      operation_id: string;
    };
    [key: string]: unknown;
  } | {
    action: "register_capability";
    status: "registered";
    capability: {
      capability_id: string;
      case_id?: string;
      effect_type?: string;
      not_after?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "revoke_capability";
    status: "revoked";
    kind: "capability";
    id: string;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "revocation";
      target_kind: "capability";
      target_id: string;
      revoked_by_principal_sha256: string;
      operation_id: string;
    };
    [key: string]: unknown;
  } | {
    action: "verify_capability";
    status: "verified";
    decision: "allow" | "deny";
    deny_reasons: Array<string>;
    verification_id: string;
    capability_id: string;
    valid_until: string;
    reliance: string;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "capability_verification";
      verification_id: string;
      capability_id: string;
      case_id: string;
      decision: "allow" | "deny";
      deny_reasons: Array<string>;
      effect_id: string;
      requested_effect_sha256: string;
      executor_principal_sha256: string;
      reliance: string;
      valid_until: string;
    };
    [key: string]: unknown;
  } | {
    action: "record_effect";
    status: "recorded";
    verification_id: string;
    outcome: "succeeded" | "failed" | "not_attempted";
    reported_after_valid_until: boolean;
    receipt: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "effect_report";
      verification_id: string;
      capability_id: string;
      effect_id: string;
      outcome: "succeeded" | "failed" | "not_attempted";
      external_ref_sha256: (string | unknown);
      reported_after_valid_until: boolean;
      commit_id?: string;
    };
    [key: string]: unknown;
  } | {
    action: "get";
    status: "ok";
    anchor?: {
      anchor_id: string;
      anchor_role?: string;
      trust_tier?: string;
      status?: string;
      [key: string]: unknown;
    };
    credential?: {
      credential_id: string;
      usable: boolean;
      reasons: Array<string>;
      [key: string]: unknown;
    };
    source_record?: {
      record_id: string;
      usable: boolean;
      reasons: Array<string>;
      [key: string]: unknown;
    };
    closure?: {
      closure_id: string;
      usable?: boolean;
      reasons?: Array<string>;
      [key: string]: unknown;
    };
    capability?: {
      capability_id: string;
      case_id?: string;
      effect_type?: string;
      not_after?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    action: "trace";
    status: "ok";
    capability_id: string;
    currently_valid: boolean;
    reasons: Array<string>;
    reliance: string;
    [key: string]: unknown;
  } | {
    action: "commit_effect";
    status: "checked" | "already_committed";
    decision: "commit" | "deny" | "already_committed";
    verification_id: string;
    commit_id: string;
    commit_valid_until: string;
    deny_reasons?: Array<string>;
    receipt?: {
      sequence: number;
      prev_sha256: string;
      recorded_at: string;
      sha256: string;
      signature: ({
          status: "unsigned";
          reason: string;
          standard?: "MVR-RECEIPT-SIG-V1";
          key_id?: string;
          registry_url?: string;
        } | {
          standard: "MVR-RECEIPT-SIG-V1";
          status: "signed";
          algorithm: "Ed25519";
          key_id: string;
          registry_url?: string;
          signature_b64: string;
        });
      lab_fixture?: boolean;
      production_authority?: false;
      kind: "effect_commit";
      commit_id: string;
      verification_id: string;
      capability_id: string;
      effect_id: string;
      requested_effect_sha256: string;
      decision: "commit" | "deny";
      deny_reasons: Array<string>;
      commit_valid_until: string;
      executor_principal_sha256: string;
    };
    [key: string]: unknown;
  } | {
    action: "check_permission";
    status: "ok";
    permission_position: {
      contract_version: "mvr.permission-position/1";
      tier: "prohibited" | "not_permitted" | "planning_only" | "conditionally_permitted" | "permitted_up_to_ceiling" | "fully_permitted";
      institution_capability_covers_effect: boolean;
      narrowest_allowed_now: Array<unknown>;
      blocked: Array<unknown>;
      closure_path: {
        status: string;
        minimum_accountable_acts: number;
        acts: Array<unknown>;
        [key: string]: unknown;
      };
      execution_authorized: false;
      [key: string]: unknown;
    };
    dependency_graph: {
      nodes: Array<unknown>;
      edges: Array<unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  });

export type AuthorityChainContract = {
  contract_version?: "mvr.authority-chain/1";
  route?: "/v1/authority-chain";
  closure_assurance?: Array<string>;
  issued_by_amos?: false;
  amos_authorization?: false;
  [key: string]: unknown;
};

export type AuthorityReceiptVerificationResponse = {
  valid: boolean;
  hash_valid: boolean;
  signature_verified: boolean;
  chain_link_verified: boolean;
  chronology_verified: boolean;
  production_authority: false;
  execution_authorized: false;
  reason: string | null;
  key_id?: string;
  key_status?: string;
  lab_fixture?: boolean;
  boundary?: string;
  [key: string]: unknown;
};

export type ReviewerAttestationResponse = {
  status?: "recorded" | "ok" | "revoked" | "forbidden" | "not_found" | "invalid_input" | "conflict" | "system_unavailable";
  code?: string;
  attestation?: {
    attestation_id?: string;
    status?: "active" | "revoked" | "expired";
    content_sha256?: string;
    context_sha256?: string;
    account_link_authenticated?: boolean;
    human_presence_verified?: false;
    professional_licence_verified?: false;
    source_authenticity_verified?: false;
    scoring_eligible?: false;
    execution_authorized?: false;
    [key: string]: unknown;
  };
  idempotent_replay?: boolean;
  reference_scope?: {
    tenant_id?: string;
    workspace_id?: string;
    [key: string]: unknown;
  };
  reference_secret_returned?: false;
  execution_authorized?: false;
  [key: string]: unknown;
};

export type ReviewerAttestationContract = {
  contract_version?: "mvr.reviewer-attestation/1";
  authenticated_account_required?: true;
  examiner_engagement_required?: false;
  execution_authorized?: false;
  scoring_eligible?: false;
  [key: string]: unknown;
};

export type KeyCeremonyResponse = {
  status: "ready" | "completed" | "refused" | "token_active" | "recovered";
  code?: string;
  http_status?: number;
  contract_version?: string;
  ceremony_id?: string;
  key_id?: string;
  participants_sha256?: string;
  worker_script?: string;
  deployment_revision?: string;
  token?: {
    kind?: "user" | "account";
    id_sha256?: string;
    expires_on?: string;
    [key: string]: unknown;
  };
  deployed_version_before?: string;
  deployed_version_after?: string;
  will_create?: Array<string>;
  public_key_fingerprint_sha256?: string;
  birth_record?: {
    type?: "mvr.receipt-key-birth/1";
    ceremony_id?: string;
    key_id?: string;
    algorithm?: "Ed25519";
    public_key_spki_b64?: string;
    public_key_fingerprint_sha256?: string;
    participants_sha256?: string;
    generated_at?: string;
    not_before?: string;
    rotation_due_at?: string;
    generated_in?: "cloudflare_worker";
    worker_script?: string;
    deployment_revision?: string;
    deployed_version_before?: string;
    private_key_destination?: string;
    private_key_returned_to_caller?: false;
    cloudflare_token_id_sha256?: string;
    statement?: string;
    [key: string]: unknown;
  };
  birth_signature_b64?: string;
  failed_step?: string;
  cause?: string;
  secrets_written?: Array<string>;
  recovery?: string;
  next?: (string | Array<string>);
  note?: string;
  ceremony?: {
    [key: string]: unknown;
  };
  execution_authorized: false;
  issued_by_amos_as_authority?: false;
  grants_permission?: false;
  [key: string]: unknown;
};

export type KeyCeremonyStatus = {
  contract_version?: string;
  ceremony: {
    state: "not_started" | "started" | "completed" | "failed" | "unavailable" | "reset_for_rehearsal";
    ceremony_id?: string;
    key_id?: string;
    started_at?: string;
    completed_at?: string | null;
    failed_step?: string | null;
    failure_code?: string | null;
    public_key_fingerprint_sha256?: string | null;
    birth_record?: {
      type?: "mvr.receipt-key-birth/1";
      ceremony_id?: string;
      key_id?: string;
      algorithm?: "Ed25519";
      public_key_spki_b64?: string;
      public_key_fingerprint_sha256?: string;
      participants_sha256?: string;
      generated_at?: string;
      not_before?: string;
      rotation_due_at?: string;
      generated_in?: "cloudflare_worker";
      worker_script?: string;
      deployment_revision?: string;
      deployed_version_before?: string;
      private_key_destination?: string;
      private_key_returned_to_caller?: false;
      cloudflare_token_id_sha256?: string;
      statement?: string;
      [key: string]: unknown;
    } | null;
    birth_signature_b64?: string | null;
    [key: string]: unknown;
  };
  registry_activation: string;
  private_key_binding: {
    present?: boolean;
    type?: string | null;
    algorithm?: string | null;
    extractable?: boolean | null;
    usages?: Array<string> | null;
    [key: string]: unknown;
  };
  ceremony_record_present?: boolean;
  birth_record_verification?: {
    valid?: boolean;
    checks?: {
      format?: boolean;
      fingerprint?: boolean;
      signature?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  execution_authorized?: false;
  [key: string]: unknown;
};

export type KeyCeremonyContract = {
  contract_version: string;
  route: string;
  actions?: {
    [key: string]: unknown;
  };
  request?: {
    [key: string]: unknown;
  };
  custody?: {
    [key: string]: unknown;
  };
  order?: Array<string>;
  refusals: Array<string>;
  rate_limits?: {
    per_client_ip_per_hour?: number;
    global_per_hour?: number;
    [key: string]: unknown;
  };
  key_status?: {
    [key: string]: unknown;
  };
  boundary?: string;
  [key: string]: unknown;
};

export type ReviewProgress = {
  contract_version?: "mvr.review-progress/1";
  policy_version?: "internal-review-preparation/2";
  case_id?: string;
  mode?: "internal_review" | "sandbox_evaluation" | "account_evaluation";
  case_revision?: number;
  context_sha256?: string;
  status?: "withdrawn" | "bounded_review_ready" | "awaiting_review" | "review_unavailable";
  procedure?: {
    code?: string;
    state?: string;
    distinct_supporting_accounts?: number;
    verified_independent_people?: 0;
    [key: string]: unknown;
  };
  residual_risks?: Array<{
      code?: string;
      state?: "open" | "closed";
      closure?: string;
      [key: string]: unknown;
    }>;
  dependencies?: Array<{
      attestation_id?: string;
      status?: string;
      expires_at?: string;
      [key: string]: unknown;
    }>;
  bounded_next_action?: {
    action?: "prepare_internal_review_packet";
    method?: "POST";
    path?: string;
    request?: {
      [key: string]: unknown;
    };
    permission_scope?: "internal_document_preparation_only";
    external_action_authorized?: false;
    [key: string]: unknown;
  } | null;
  bounded_next_actions?: Array<{
      action?: "internal_pilot_design" | "evidence_collection_design";
      method?: "POST";
      path?: string;
      request?: {
        [key: string]: unknown;
      };
      permission_scope?: "internal_planning_workflow_only";
      external_action_authorized?: false;
      [key: string]: unknown;
    }>;
  review_resolution?: {
    status?: string;
    conflicting_attestation_ids?: Array<string>;
    inactive_attestation_ids?: Array<string>;
    instructions?: Array<string>;
    factual_gaps_closed?: Array<{
        code?: string;
        scope_ref?: string;
        assurance?: "lab_fixture" | "tenant_declared" | "independent_authenticated";
        closure_id?: string;
        expires_at?: string;
        [key: string]: unknown;
      }>;
    numeric_credibility_weights_used?: false;
    [key: string]: unknown;
  };
  continuation_disposition?: "bounded_action_available" | "await_input";
  checked_at?: string;
  valid_until?: string;
  basis_sha256?: string;
  current_state_required?: true;
  execution_authorized?: false;
  external_action_authorized?: false;
  scoring_eligible?: false;
  source_authenticity_verified?: false;
  professional_standing_verified?: false;
  residual_closures?: Array<{
      closure_id?: string;
      residual_code?: string | null;
      scope_ref?: string | null;
      usable?: boolean;
      assurance?: string | null;
      expires_at?: string | null;
      reasons?: Array<string>;
      authenticated_sources?: Array<{
          source_doc_id?: string;
          tier?: string;
          [key: string]: unknown;
        }>;
      [key: string]: unknown;
    }>;
  [key: string]: unknown;
};

export interface GovernanceResult<T> { status: number; body: T | null; }
export interface GovernanceClientOptions { baseUrl?: string; apiKey?: string | null; fetch?: typeof fetch; responseProfile?: string; headers?: Record<string, string>; }
export declare const GOVERNANCE_OPERATIONS: Readonly<Record<string, {method: 'GET' | 'POST'; path: string; api_key: boolean; summary: string}>>;
export declare class GovernanceClient {
  constructor(options?: GovernanceClientOptions);
  call(name: string, body?: unknown): Promise<GovernanceResult<unknown>>;
  reviewCases(body: ReviewCasesRequest): Promise<GovernanceResult<ReviewCasesResponse>>;
  reviewCasesContract(): Promise<GovernanceResult<ReviewCasesContractResponse>>;
  reviewSandbox(body: ReviewSandboxRequest): Promise<GovernanceResult<ReviewSandboxResponse>>;
  reviewSandboxContract(): Promise<GovernanceResult<ReviewSandboxContractResponse>>;
  authorityChain(body: AuthorityChainRequest): Promise<GovernanceResult<AuthorityChainResponse>>;
  authorityChainContract(): Promise<GovernanceResult<AuthorityChainContractResponse>>;
  authorityReceiptsVerify(body: AuthorityReceiptsVerifyRequest): Promise<GovernanceResult<AuthorityReceiptsVerifyResponse>>;
  reviewerAttestations(body: ReviewerAttestationsRequest): Promise<GovernanceResult<ReviewerAttestationsResponse>>;
  reviewerAttestationsContract(): Promise<GovernanceResult<ReviewerAttestationsContractResponse>>;
  keyCeremony(body: KeyCeremonyRequest): Promise<GovernanceResult<KeyCeremonyResponse>>;
  keyCeremonyStatus(): Promise<GovernanceResult<KeyCeremonyStatusResponse>>;
  keyCeremonyContract(): Promise<GovernanceResult<KeyCeremonyContractResponse>>;
}
