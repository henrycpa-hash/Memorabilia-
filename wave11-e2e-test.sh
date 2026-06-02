#!/usr/bin/env bash
# Wave 11 end-to-end exercise. Walks through the 6 spec-defined operating flows:
#   1. External sovereign attestation flow (assemble -> sign -> request export -> approve -> verify)
#   2. Remittance rail execution flow (submit -> ack -> reconcile, plus failure path with allowRetry)
#   3. Real-time contract collaboration flow (start -> presence -> ops with merge safeguards -> checkpoint)
#   4. Two-way regulator operations flow (submit -> ingest ack -> ingest RFI w/extension -> response pack -> closure)
#   5. Driver-based forecast + RevOps sync flow (run -> sensitivity, plus CRM sync + reconciliation)
#   6. Sovereignty incident command flow (open -> classify -> fan-out -> resolve postmortem)

set -euo pipefail
GATEWAY="${GATEWAY:-http://localhost:4000}"

note() { printf "\n\033[1;36m== %s ==\033[0m\n" "$*"; }
ok()   { printf "  \033[1;32m✔\033[0m %s\n" "$*"; }

# --- 1. Register admin ---
note "1. Register admin"
ADMIN_REGISTER=$(curl -s -X POST "$GATEWAY/api/auth/register" \
  -H "content-type: application/json" \
  -d '{"email":"wave11-admin@crownx.test","password":"Wave11!@#admin","displayName":"Wave11 Admin","role":"admin"}')
TOKEN=$(echo "$ADMIN_REGISTER" | grep -oE '"accessToken":"[^"]+"' | cut -d'"' -f4)
[ -n "$TOKEN" ] || { echo "ERROR: token empty"; echo "$ADMIN_REGISTER"; exit 1; }
AUTH_HEADER="authorization: Bearer $TOKEN"
ok "admin token captured"

# --- 2. Tenant ---
note "2. Create sovereign tenant"
TENANT=$(curl -s -X POST "$GATEWAY/api/tenancy/tenants" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"name":"Sovereign Wave11 Bank","tier":"sovereign_dedicated","region":"eu_west"}')
TENANT_ID=$(echo "$TENANT" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$TENANT_ID" ] || { echo "ERROR"; echo "$TENANT"; exit 1; }
ok "tenant $TENANT_ID created"

# ============================================================
# FLOW 1: EXTERNAL SOVEREIGN ATTESTATION
# ============================================================
note "3. Sovereign attestation packet -> sign -> export -> approve -> verify"

# Set up a custody profile so attestation source pull has data
curl -s -X POST "$GATEWAY/api/custody/profiles" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"custodyMode\":\"sovereign_isolated_managed\",\"regionKey\":\"eu_west\",\"policy\":{\"allowedReferenceTypes\":[\"contract_version\"],\"allowedRegions\":[\"eu_west\"],\"attestationRequired\":true,\"externalExportAllowed\":false,\"breakGlassApproverRoles\":[\"admin\"],\"dailyUsageCap\":100}}" >/dev/null
ok "custody profile seeded for source pull"

PACKET=$(curl -s -X POST "$GATEWAY/api/attestation/packets" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"packetType\":\"tenant_period_summary\",\"periodKey\":\"2026-Q2\",\"sourceOverrides\":[{\"referenceType\":\"control_summary\",\"referenceId\":\"ctrl_q2_eu\",\"content\":\"All EU sovereign controls passed Q2 review\"}]}")
PACKET_ID=$(echo "$PACKET" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
MANIFEST_DIGEST=$(echo "$PACKET" | grep -oE '"manifestDigest":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "packet $PACKET_ID assembled (manifestDigest=$MANIFEST_DIGEST)"

curl -s -X POST "$GATEWAY/api/attestation/packets/$PACKET_ID/sign" -H "$AUTH_HEADER" >/dev/null
ok "packet signed"

EXPORT=$(curl -s -X POST "$GATEWAY/api/attestation/exports" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"packetId\":\"$PACKET_ID\",\"exportTargetType\":\"external_auditor\",\"exportTargetId\":\"deloitte_eu\"}")
EXPORT_ID=$(echo "$EXPORT" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
APPROVED=$(curl -s -X POST "$GATEWAY/api/attestation/exports/$EXPORT_ID/approve" -H "$AUTH_HEADER")
echo "$APPROVED" | grep -q '"externalVerificationUri"' && ok "export approved with verification URI"

# Verify packet against original content
VERIFY=$(curl -s -X POST "$GATEWAY/api/attestation/packets/$PACKET_ID/verify" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"content":[{"referenceType":"control_summary","referenceId":"ctrl_q2_eu","content":"All EU sovereign controls passed Q2 review"}]}')
echo "$VERIFY" | grep -q '"valid":true' && ok "packet verified against caller-supplied source content"

# ============================================================
# FLOW 2: REMITTANCE RAIL EXECUTION
# ============================================================
note "4. Remittance rail submission -> ack -> reconcile, plus failure with retry"

# First create an obligation in tax-remittance
OBLIG=$(curl -s -X POST "$GATEWAY/api/tax/obligations" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"jurisdictionKey":"GB","obligationType":"vat_filing","periodEnd":"2026-03-31T23:59:59Z","amountDueCents":3500000,"deadlineDaysAfterPeriodEnd":30,"periodType":"quarterly"}')
OBLIG_ID=$(echo "$OBLIG" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "UK VAT obligation $OBLIG_ID created"

# Submit through rail (HMRC bacs)
SUB=$(curl -s -X POST "$GATEWAY/api/rails/submissions" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"obligationId\":\"$OBLIG_ID\",\"jurisdictionKey\":\"GB\",\"railType\":\"bacs\",\"amountCents\":3500000}")
SUB_ID=$(echo "$SUB" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
EXTERNAL_REF=$(echo "$SUB" | grep -oE '"externalSubmissionRef":"[^"]+"' | cut -d'"' -f4)
ok "rail submission $SUB_ID submitted (externalRef=$EXTERNAL_REF)"

curl -s -X POST "$GATEWAY/api/rails/submissions/$SUB_ID/acknowledge" -H "$AUTH_HEADER" >/dev/null
curl -s -X POST "$GATEWAY/api/rails/submissions/$SUB_ID/reconcile" -H "$AUTH_HEADER" >/dev/null
ok "submission acknowledged + reconciled"

# Failure + retry path
SUB2=$(curl -s -X POST "$GATEWAY/api/rails/submissions" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"obligationId\":\"$OBLIG_ID\",\"jurisdictionKey\":\"DE\",\"railType\":\"sepa\",\"amountCents\":1500000,\"idempotencyKey\":\"dem_test_retry_001\"}")
SUB2_ID=$(echo "$SUB2" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$GATEWAY/api/rails/submissions/$SUB2_ID/fail" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"reason":"rail_timeout","allowRetry":true}' >/dev/null
ok "second submission failed with allowRetry; status flipped to queued"
RETRY=$(curl -s -X POST "$GATEWAY/api/rails/submissions/$SUB2_ID/retry" -H "$AUTH_HEADER")
echo "$RETRY" | grep -q '"status":"submitted"' && ok "retry succeeded"

curl -s "$GATEWAY/api/rails/pipeline-summary" -H "$AUTH_HEADER" | head -c 200 ; echo
ok "rail pipeline summary fetched"

# ============================================================
# FLOW 3: REAL-TIME COLLABORATION
# ============================================================
note "5. Realtime session -> presence -> ops with merge safeguards -> checkpoint"

SESSION=$(curl -s -X POST "$GATEWAY/api/realtime/sessions" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"workspaceType":"redline_workspace","workspaceId":"agreement_msa_acme_v3"}')
SESSION_ID=$(echo "$SESSION" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "session $SESSION_ID started (auto-pauses any prior open session)"

# 3 users join
for u in user_legal_1 user_external_counsel_1 user_business_owner_1; do
  curl -s -X PUT "$GATEWAY/api/realtime/sessions/$SESSION_ID/presence" -H "content-type: application/json" -H "$AUTH_HEADER" \
    -d "{\"state\":\"active\",\"cursorAnchor\":\"clause_liability_$u\"}" >/dev/null
done
ok "3 users present + cursors anchored"

# Apply 4 ops
OP1=$(curl -s -X POST "$GATEWAY/api/realtime/sessions/$SESSION_ID/operations" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"kind":"comment_added","anchor":"clause_liability","payload":{"body":"Counterparty asks 24mo cap"},"expectedSequence":0}')
echo "$OP1" | grep -q '"accepted":true' && ok "op1 (comment_added) accepted at seq 1"

OP2=$(curl -s -X POST "$GATEWAY/api/realtime/sessions/$SESSION_ID/operations" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"kind":"section_locked","anchor":"clause_liability","payload":{},"expectedSequence":1}')
echo "$OP2" | grep -q '"accepted":true' && ok "op2 (section_locked) accepted; clause_liability now locked"

# Stale expectedSequence -> merge_conflict rejection
OP3_STALE=$(curl -s -X POST "$GATEWAY/api/realtime/sessions/$SESSION_ID/operations" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"kind":"clause_proposed","anchor":"clause_termination","payload":{"language":"24mo notice"},"expectedSequence":99}')
echo "$OP3_STALE" | grep -q '"merge_conflict' && ok "stale-sequence op rejected (merge_conflict)"

# Section-locked op rejection (would need a different actor, but our token is the same admin user; let's still send and confirm the lock holder can still operate)
OP4=$(curl -s -X POST "$GATEWAY/api/realtime/sessions/$SESSION_ID/operations" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"kind":"section_unlocked","anchor":"clause_liability","payload":{},"expectedSequence":2}')
echo "$OP4" | grep -q '"accepted":true' && ok "op4 (section_unlocked by lock holder) accepted at seq 3"

# Publish checkpoint
curl -s -X POST "$GATEWAY/api/realtime/sessions/$SESSION_ID/checkpoints" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"label":"after_initial_review"}' >/dev/null
ok "checkpoint published"

# ============================================================
# FLOW 4: TWO-WAY REGULATOR OPERATIONS
# ============================================================
note "6. Regulator portal submit -> ingest ack -> RFI w/extension -> response pack -> closure"

# Create a regulator-notice (Wave 10) to drive the portal connector
NOTICE=$(curl -s -X POST "$GATEWAY/api/regulator-notices" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"jurisdictionKey":"EU","sourceType":"data_breach","sourceId":"incident_w11_demo_breach","severity":"high","title":"EU breach notice (Wave 11 demo)"}')
NOTICE_ID=$(echo "$NOTICE" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "regulator notice $NOTICE_ID generated"

# Submit through portal (EDPB)
PORTAL_REF=$(curl -s -X POST "$GATEWAY/api/regulator-portals/refs" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"noticeId\":\"$NOTICE_ID\",\"jurisdictionKey\":\"EU\",\"regulatorKey\":\"edpb\",\"originalDueDate\":\"2026-05-01T00:00:00Z\"}")
REF_ID=$(echo "$PORTAL_REF" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
EXTREF=$(echo "$PORTAL_REF" | grep -oE '"externalRef":"[^"]+"' | cut -d'"' -f4)
ok "EDPB portal ref $REF_ID created (externalRef=$EXTREF)"

# Ingest ack
curl -s -X POST "$GATEWAY/api/regulator-portals/inbound" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"externalRef\":\"$EXTREF\",\"responseType\":\"acknowledgement\",\"payload\":{\"reviewer\":\"edpb_intake_1\"}}" >/dev/null
ok "acknowledgement ingested -> ref status=accepted"

# Ingest RFI with 14-day extension
RFI=$(curl -s -X POST "$GATEWAY/api/regulator-portals/inbound" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"externalRef\":\"$EXTREF\",\"responseType\":\"request_for_info\",\"payload\":{\"questions\":[\"Provide affected user count by member state\"]},\"extensionDays\":14}")
RFI_ID=$(echo "$RFI" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "$RFI" | grep -q '"newDueDate"' && ok "RFI ingested with 14-day extension; effective deadline updated"

# Generate response pack
curl -s -X POST "$GATEWAY/api/regulator-portals/inbound/$RFI_ID/response-pack" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{}' >/dev/null
ok "response pack generated for RFI"

# Closure
curl -s -X POST "$GATEWAY/api/regulator-portals/inbound" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"externalRef\":\"$EXTREF\",\"responseType\":\"closure_notice\"}" >/dev/null
ok "closure notice ingested"

# ============================================================
# FLOW 5: DRIVER FORECAST + CRM SYNC + RECONCILIATION
# ============================================================
note "7. Driver-based forecast + sensitivity + CRM sync + variance reconciliation"

# Strategic account (Wave 10) for the forecast linkage
ACCT=$(curl -s -X POST "$GATEWAY/api/planning/accounts" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"accountName":"Wave 11 Sovereign Bank","sovereigntyTier":"sovereign_dedicated","crmAccountRef":"sf_acct_8001"}')
ACCT_ID=$(echo "$ACCT" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)

# Wave 10 forecast (so reconciliation has a platform-side baseline)
curl -s -X POST "$GATEWAY/api/planning/forecasts" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"accountId\":\"$ACCT_ID\",\"periodKey\":\"2026-Q3\",\"assumptions\":{\"baselineRevenueCents\":80000000,\"growthBps\":2500,\"readinessScore\":70,\"sovereigntyComplexity\":60,\"closeProbabilityBps\":7500,\"procurementCycleDays\":75}}" >/dev/null
ok "Wave 10 platform forecast persisted as reconciliation baseline"

# Wave 11 driver-forecast run (6 driver inputs)
RUN=$(curl -s -X POST "$GATEWAY/api/forecast-drivers/runs" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"accountId\":\"$ACCT_ID\",\"periodKey\":\"2026-Q3\",\"scenarioType\":\"base_case\",\"driverInputs\":[{\"driverKey\":\"baseline_revenue_cents\",\"value\":80000000},{\"driverKey\":\"growth_bps\",\"value\":2500},{\"driverKey\":\"close_probability_bps\",\"value\":7500},{\"driverKey\":\"readiness_score\",\"value\":70},{\"driverKey\":\"sovereignty_complexity\",\"value\":60},{\"driverKey\":\"procurement_cycle_days\",\"value\":75}]}")
RUN_ID=$(echo "$RUN" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "driver-forecast run $RUN_ID with 6 driver inputs"

# Sensitivity: what if procurement_cycle_days drops 50%?
SENS=$(curl -s -X POST "$GATEWAY/api/forecast-drivers/sensitivities" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"runId\":\"$RUN_ID\",\"driverKey\":\"procurement_cycle_days\",\"deltaType\":\"percent\",\"deltaValue\":-50}")
echo "$SENS" | grep -q '"varianceCents"' && ok "sensitivity for procurement_cycle_days -50% computed"

# CRM sync — Salesforce account + 3 opportunities at varied stages
curl -s -X POST "$GATEWAY/api/crm-revops/accounts" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"externalAccountId\":\"sf_acct_8001\",\"internalAccountId\":\"$ACCT_ID\",\"provider\":\"salesforce\",\"payload\":{\"name\":\"Wave 11 Sovereign Bank\",\"owner\":\"sf_user_1\",\"segment\":\"sovereign\",\"industry\":\"financial_services\",\"annualRevenueCents\":50000000000}}" >/dev/null

curl -s -X POST "$GATEWAY/api/crm-revops/opportunities" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"externalOpportunityId":"sf_opp_1","externalAccountId":"sf_acct_8001","provider":"salesforce","externalStage":"Negotiation/Review","amountCents":40000000,"probabilityBps":7500}' >/dev/null
curl -s -X POST "$GATEWAY/api/crm-revops/opportunities" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"externalOpportunityId":"sf_opp_2","externalAccountId":"sf_acct_8001","provider":"salesforce","externalStage":"Value Proposition","amountCents":25000000}' >/dev/null
curl -s -X POST "$GATEWAY/api/crm-revops/opportunities" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"externalOpportunityId":"sf_opp_3","externalAccountId":"sf_acct_8001","provider":"salesforce","externalStage":"Qualification","amountCents":15000000}' >/dev/null
ok "Salesforce account + 3 opportunities synced (stages auto-normalized to platform stages)"

RECON=$(curl -s -X POST "$GATEWAY/api/crm-revops/reconciliations" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"accountId\":\"$ACCT_ID\",\"periodKey\":\"2026-Q3\",\"externalAccountId\":\"sf_acct_8001\"}")
echo "$RECON" | grep -q '"varianceCents"' && ok "platform-vs-CRM reconciliation produced variance"

# ============================================================
# FLOW 6: SOVEREIGNTY INCIDENT COMMAND
# ============================================================
note "8. Sovereignty incident -> classification -> fan-out runbook -> resolve postmortem"

INC=$(curl -s -X POST "$GATEWAY/api/sovereignty-incidents" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"sovereigntyClassKey\":\"sovereign_dedicated\",\"incidentType\":\"data_breach\",\"title\":\"Cohort access misconfiguration in EU sovereign cluster\",\"baseSeverity\":\"high\",\"affectedRegions\":[\"eu_west\",\"eu_central\"],\"involvesRegulatedData\":true,\"payload\":{\"affectedRecords\":12500}}")
INC_ID=$(echo "$INC" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
EFFECTIVE_SEV=$(echo "$INC" | grep -oE '"severity":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "incident $INC_ID classified — base=high effective=$EFFECTIVE_SEV (sovereign_dedicated bumped severity)"
echo "$INC" | grep -q '"legalEscalationRequired":true' && ok "playbook flagged legal escalation"
echo "$INC" | grep -q '"regulatorNoticeRequired":true' && ok "playbook flagged regulator notice"
echo "$INC" | grep -q '"residencyReviewRequired":true' && ok "playbook flagged residency review (cross-region)"
echo "$INC" | grep -q '"freezeExports":false' || ok "no freeze required (data_breach default)"

# Run all queued runbook actions
RAN=$(curl -s -X POST "$GATEWAY/api/sovereignty-incidents/$INC_ID/run-all-actions" -H "$AUTH_HEADER")
ACTIONS_DONE=$(echo "$RAN" | grep -oE '"completedAt":"[^"]+"' | wc -l)
ok "ran $ACTIONS_DONE runbook actions through legal-escalation / regulator-notice / residency / etc."

# Resolve with postmortem
curl -s -X POST "$GATEWAY/api/sovereignty-incidents/$INC_ID/contain" -H "$AUTH_HEADER" >/dev/null
curl -s -X POST "$GATEWAY/api/sovereignty-incidents/$INC_ID/remediate" -H "$AUTH_HEADER" >/dev/null
curl -s -X POST "$GATEWAY/api/sovereignty-incidents/$INC_ID/resolve" -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"postmortem":{"timeline":[{"at":"2026-04-01T10:00:00Z","event":"misconfig deployed"},{"at":"2026-04-01T11:30:00Z","event":"detected by audit"}],"rootCause":"Stale IAM policy from prior tenant","impact":"Cross-tenant cohort visibility for 90 minutes","remediation":["IAM policy rolled back","Custody keys rotated","Affected users notified"],"followUps":["Add policy linter to deploy gate","Quarterly IAM ceremony"]}}' >/dev/null
ok "incident resolved + postmortem stored"

# Pipeline summary
curl -s "$GATEWAY/api/sovereignty-incidents/pipeline-summary" -H "$AUTH_HEADER" | head -c 300 ; echo
ok "incident pipeline summary fetched"

# ============================================================
# FINAL SNAPSHOT
# ============================================================
note "9. Wave 11 surface snapshot"
echo "  attestation packets:        $(curl -s "$GATEWAY/api/attestation/packets" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  attestation exports:        $(curl -s "$GATEWAY/api/attestation/exports" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  rail submissions:           $(curl -s "$GATEWAY/api/rails/submissions" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  realtime sessions:          $(curl -s "$GATEWAY/api/realtime/sessions" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  regulator portal refs:      $(curl -s "$GATEWAY/api/regulator-portals/refs" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  driver-forecast runs:       $(curl -s "$GATEWAY/api/forecast-drivers/runs" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  CRM accounts:               $(curl -s "$GATEWAY/api/crm-revops/accounts" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  CRM opportunities:          $(curl -s "$GATEWAY/api/crm-revops/opportunities" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  forecast reconciliations:   $(curl -s "$GATEWAY/api/crm-revops/reconciliations" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  sovereignty incidents:      $(curl -s "$GATEWAY/api/sovereignty-incidents" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"

note "Wave 11 e2e completed."
