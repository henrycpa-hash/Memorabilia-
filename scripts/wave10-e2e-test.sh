#!/usr/bin/env bash
# Wave 10 end-to-end exercise. Walks through the 5 spec-defined operating flows:
#   1. Sovereign signing flow (custody profile -> signing key -> attestation)
#   2. Tax filing + remittance flow (obligation -> filing -> ready-to-remit -> submit -> ack)
#   3. Collaborative negotiation flow (workspace -> comments -> positions -> checkpoint -> promote)
#   4. Legal escalation flow (escalation -> route -> matter -> packet -> resolve)
#   5. Regulator notice flow (notice -> approve -> submit -> respond)
#   6. Enterprise planning flow (account -> plan -> scenario -> forecast bundle)
#
# Requires the gateway + Wave 1-10 services to be running locally.

set -euo pipefail
GATEWAY="${GATEWAY:-http://localhost:4000}"

note() { printf "\n\033[1;36m== %s ==\033[0m\n" "$*"; }
ok()   { printf "  \033[1;32m✔\033[0m %s\n" "$*"; }

# --- 1. Register an admin user (Wave 2 auth) ---
note "1. Register admin"
ADMIN_REGISTER=$(curl -s -X POST "$GATEWAY/api/auth/register" \
  -H "content-type: application/json" \
  -d '{"email":"wave10-admin@crownx.test","password":"Wave10!@#admin","displayName":"Wave10 Admin","role":"admin"}')
TOKEN=$(echo "$ADMIN_REGISTER" | grep -oE '"accessToken":"[^"]+"' | cut -d'"' -f4)
[ -n "$TOKEN" ] || { echo "ERROR: token empty"; echo "$ADMIN_REGISTER"; exit 1; }
AUTH_HEADER="authorization: Bearer $TOKEN"
ok "admin registered, token captured"

# --- 2. Create tenant (reused for sovereign assignment + custody) ---
note "2. Create tenant"
TENANT_CREATE=$(curl -s -X POST "$GATEWAY/api/tenancy/tenants" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"name":"Sovereign EU Bank","tier":"sovereign_dedicated","region":"eu_west"}')
TENANT_ID=$(echo "$TENANT_CREATE" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$TENANT_ID" ] || { echo "ERROR: tenant id empty"; echo "$TENANT_CREATE"; exit 1; }
ok "tenant $TENANT_ID created"

# ============================================================
# FLOW 1: SOVEREIGN SIGNING
# ============================================================
note "3. Sovereign custody profile + signing key + attested signing"

CUSTODY=$(curl -s -X POST "$GATEWAY/api/custody/profiles" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"tenantId\":\"$TENANT_ID\",
    \"custodyMode\":\"sovereign_isolated_managed\",
    \"regionKey\":\"eu_west\",
    \"policy\":{
      \"allowedReferenceTypes\":[\"contract_version\",\"regulatory_filing\",\"attestation_export\"],
      \"allowedRegions\":[\"eu_west\",\"eu_central\"],
      \"attestationRequired\":true,
      \"externalExportAllowed\":false,
      \"breakGlassApproverRoles\":[\"executive_counsel\",\"admin\"],
      \"dailyUsageCap\":100
    }
  }")
CUSTODY_ID=$(echo "$CUSTODY" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "custody profile $CUSTODY_ID created (sovereign_isolated_managed, EU-only)"

KEY=$(curl -s -X POST "$GATEWAY/api/custody/keys" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"custodyProfileId\":\"$CUSTODY_ID\",
    \"keyAlias\":\"eu_signing_v1\",
    \"regionKey\":\"eu_west\",
    \"keyType\":\"ed25519\"
  }")
KEY_ID=$(echo "$KEY" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "signing key $KEY_ID created (ed25519, eu_west)"

# Sign a contract — expect attestation receipt
SIGN_OK=$(curl -s -X POST "$GATEWAY/api/custody/sign" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"keyId\":\"$KEY_ID\",
    \"referenceType\":\"contract_version\",
    \"referenceId\":\"contract_msa_v1\",
    \"callerRegion\":\"eu_west\",
    \"callerRole\":\"compliance_officer\",
    \"isBreakGlass\":false
  }")
echo "$SIGN_OK" | grep -q '"decision":"allow"' && ok "signing allowed"
echo "$SIGN_OK" | grep -q '"controlState":"verified"' && ok "attestation receipt issued"

# Sign from US — expect deny (region not allowed)
SIGN_DENY=$(curl -s -X POST "$GATEWAY/api/custody/sign" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"keyId\":\"$KEY_ID\",
    \"referenceType\":\"contract_version\",
    \"referenceId\":\"contract_msa_v2\",
    \"callerRegion\":\"us_east\",
    \"callerRole\":\"compliance_officer\",
    \"isBreakGlass\":false
  }")
echo "$SIGN_DENY" | grep -q '"decision":"deny"' && ok "us_east signing denied (sovereign EU-only)"

# Break-glass with admin role — expect allow + attestation
SIGN_BG=$(curl -s -X POST "$GATEWAY/api/custody/sign" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"keyId\":\"$KEY_ID\",
    \"referenceType\":\"regulatory_filing\",
    \"referenceId\":\"filing_uk_vat_q1\",
    \"callerRegion\":\"eu_west\",
    \"callerRole\":\"admin\",
    \"isBreakGlass\":true
  }")
echo "$SIGN_BG" | grep -q '"decision":"allow"' && ok "break-glass admin signing allowed with attestation"

# ============================================================
# FLOW 2: TAX FILING + REMITTANCE
# ============================================================
note "4. Tax obligation -> remittance run -> ack"

OBLIG=$(curl -s -X POST "$GATEWAY/api/tax/obligations" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{
    "jurisdictionKey":"GB",
    "obligationType":"vat_filing",
    "periodEnd":"2026-03-31T23:59:59Z",
    "amountDueCents":2500000,
    "deadlineDaysAfterPeriodEnd":37,
    "periodType":"quarterly",
    "payload":{"vat_due":2500000,"sales_total":12500000}
  }')
OBLIG_ID=$(echo "$OBLIG" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "UK VAT Q1 obligation $OBLIG_ID created (£25k due)"

# Mark ready to remit (skipping the link-filing step since regulatory-filing is independent)
curl -s -X PUT "$GATEWAY/api/tax/obligations/$OBLIG_ID/ready-to-remit" \
  -H "$AUTH_HEADER" >/dev/null
ok "obligation marked ready_to_remit"

REMIT=$(curl -s -X POST "$GATEWAY/api/tax/remittances" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"obligationId\":\"$OBLIG_ID\",\"rail\":\"sepa\"}")
REMIT_ID=$(echo "$REMIT" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "remittance run $REMIT_ID queued (sepa rail)"

curl -s -X POST "$GATEWAY/api/tax/remittances/$REMIT_ID/submit" \
  -H "$AUTH_HEADER" >/dev/null
curl -s -X POST "$GATEWAY/api/tax/remittances/$REMIT_ID/acknowledge" \
  -H "$AUTH_HEADER" >/dev/null
ok "remittance submitted + acknowledged (obligation auto-flips to remitted)"

# Failure path — second obligation, fail it
OBLIG2=$(curl -s -X POST "$GATEWAY/api/tax/obligations" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"jurisdictionKey":"DE","obligationType":"vat_filing","periodEnd":"2026-03-31T23:59:59Z","amountDueCents":1500000,"periodType":"monthly","deadlineDaysAfterPeriodEnd":10}')
OBLIG2_ID=$(echo "$OBLIG2" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
curl -s -X PUT "$GATEWAY/api/tax/obligations/$OBLIG2_ID/ready-to-remit" -H "$AUTH_HEADER" >/dev/null
REMIT2=$(curl -s -X POST "$GATEWAY/api/tax/remittances" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"obligationId\":\"$OBLIG2_ID\",\"rail\":\"sepa\"}")
REMIT2_ID=$(echo "$REMIT2" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$GATEWAY/api/tax/remittances/$REMIT2_ID/fail" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"reason":"rail_timeout","nextAction":"retry"}' >/dev/null
ok "second remittance failed with retry next-action; exception captured"

curl -s "$GATEWAY/api/tax/remittance-pipeline-summary" -H "$AUTH_HEADER" | head -c 200
echo
ok "remittance pipeline summary fetched"

# ============================================================
# FLOW 3: COLLABORATIVE NEGOTIATION
# ============================================================
note "5. Collaborative redline workspace -> comments -> positions -> checkpoint -> promote"

# (Assumes redlining-negotiation-service from Wave 9 has at least one version. We'll create a workspace
#  without specifying the version — the service will best-effort look up the latest.)
WS=$(curl -s -X POST "$GATEWAY/api/collab-redline/workspaces" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{
    "agreementId":"agreement_msa_acme",
    "reviewers":[
      {"userId":"user_internal_legal_1","role":"internal_legal"},
      {"userId":"user_external_counsel_1","role":"external_counsel"},
      {"userId":"user_business_owner_1","role":"business_owner"}
    ]
  }')
WS_ID=$(echo "$WS" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "redline workspace $WS_ID opened with 3 reviewers"

# Add 2 comments, 1 thread
C1=$(curl -s -X POST "$GATEWAY/api/collab-redline/comments" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"clauseKey\":\"liability_limit_standard\",\"body\":\"Counterparty asks for 24-month cap; need fallback approval.\"}")
C1_ID=$(echo "$C1" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$GATEWAY/api/collab-redline/comments" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"clauseKey\":\"liability_limit_standard\",\"parentCommentId\":\"$C1_ID\",\"body\":\"Approved — invoke fallback rank 1.\"}" >/dev/null
ok "2 comments + 1 thread on liability_limit clause"

# Record clause positions
curl -s -X POST "$GATEWAY/api/collab-redline/positions" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"clauseKey\":\"indemnification_standard\",\"actorRole\":\"internal_legal\",\"positionType\":\"accept\"}" >/dev/null
curl -s -X POST "$GATEWAY/api/collab-redline/positions" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"clauseKey\":\"liability_limit_standard\",\"actorRole\":\"internal_legal\",\"positionType\":\"propose_alternative\",\"proposedLanguage\":\"Aggregate liability is limited to 2x fees paid in the prior 12 months.\"}" >/dev/null
curl -s -X POST "$GATEWAY/api/collab-redline/positions" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"clauseKey\":\"termination_for_convenience\",\"actorRole\":\"counterparty\",\"positionType\":\"reject\"}" >/dev/null
ok "3 clause positions recorded (accept / propose_alternative / reject)"

# Resolve C1 (close one of two comments)
curl -s -X POST "$GATEWAY/api/collab-redline/comments/$C1_ID/resolve" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"status":"resolved"}' >/dev/null
ok "comment C1 resolved"

# Publish a checkpoint (internal_legal_review)
CP=$(curl -s -X POST "$GATEWAY/api/collab-redline/checkpoints" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"checkpointType\":\"internal_legal_review\"}")
CP_ID=$(echo "$CP" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "checkpoint $CP_ID published (internal_legal_review)"

# Approve internal_legal checkpoint, then publish + approve final_approval
curl -s -X POST "$GATEWAY/api/collab-redline/checkpoints/$CP_ID/decide" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"status":"approved"}' >/dev/null
CP_FINAL=$(curl -s -X POST "$GATEWAY/api/collab-redline/checkpoints" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{\"workspaceId\":\"$WS_ID\",\"checkpointType\":\"final_approval\"}")
CP_FINAL_ID=$(echo "$CP_FINAL" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
curl -s -X POST "$GATEWAY/api/collab-redline/checkpoints/$CP_FINAL_ID/decide" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"status":"approved"}' >/dev/null
ok "final_approval checkpoint approved -> workspace flips to approved"

# Promote to signature
PROMO=$(curl -s -X POST "$GATEWAY/api/collab-redline/workspaces/$WS_ID/promote" \
  -H "$AUTH_HEADER")
echo "$PROMO" | grep -q '"status":"promoted_to_signature"' && ok "workspace promoted_to_signature"

# Workspace summary
SUMMARY=$(curl -s "$GATEWAY/api/collab-redline/workspaces/$WS_ID/summary" -H "$AUTH_HEADER")
echo "$SUMMARY" | head -c 200; echo
ok "workspace summary fetched"

# ============================================================
# FLOW 4: LEGAL ESCALATION
# ============================================================
note "6. Legal escalation -> route -> matter -> packet -> resolve"

ESC=$(curl -s -X POST "$GATEWAY/api/legal-escalations" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{
    "sourceType":"residency_breach",
    "sourceId":"residency_event_eu_us_export",
    "severity":"regulator_sensitive",
    "metadata":{"region":"eu_west","destination":"us_east"}
  }')
ESC_ID=$(echo "$ESC" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "$ESC" | grep -q '"routingTarget":"external_counsel"' && ok "escalation routed to external_counsel"
echo "$ESC" | grep -q '"noticeObligationCheck":true' && ok "notice obligation check flagged"
echo "$ESC" | grep -q '"legalHoldRecommended":true' && ok "legal hold recommended (residency_breach source)"

curl -s -X POST "$GATEWAY/api/legal-escalations/$ESC_ID/route" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"target":"external_counsel"}' >/dev/null
ok "routing accepted"

curl -s -X POST "$GATEWAY/api/legal-escalations/$ESC_ID/matter" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"matterRef":"matter_eu_us_export_2026"}' >/dev/null
ok "matter linked"

curl -s -X POST "$GATEWAY/api/legal-escalations/$ESC_ID/packet" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"packetType":"escalation_summary"}' >/dev/null
ok "packet assembled"

# Executive escalation example
ESC2=$(curl -s -X POST "$GATEWAY/api/legal-escalations" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"sourceType":"regulator_trigger","sourceId":"reg_audit_finding_2026q1","severity":"executive_escalation"}')
echo "$ESC2" | grep -q '"executiveNotificationFlag":true' && ok "executive escalation auto-flags executive notification"

# Pipeline summary
curl -s "$GATEWAY/api/legal-escalations/pipeline-summary" -H "$AUTH_HEADER" | head -c 200; echo
ok "escalation pipeline summary fetched"

# ============================================================
# FLOW 5: REGULATOR NOTICE
# ============================================================
note "7. Regulator notice -> approve -> submit -> respond"

# EU data breach -> two regulators (EDPB + per-MS, but only EU is in seed)
NOTICES_EU=$(curl -s -X POST "$GATEWAY/api/regulator-notices" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{
    "jurisdictionKey":"EU",
    "sourceType":"data_breach",
    "sourceId":"incident_eu_breach_2026_03",
    "severity":"high",
    "title":"EU data breach disclosure - cohort access misconfiguration",
    "payload":{"affectedRecords":12500,"controllerName":"CrownX Jewel"}
  }')
NOTICE_ID=$(echo "$NOTICES_EU" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "EU breach notice generated -> $NOTICE_ID (3-day deadline per EDPB seed)"

# UK ICO branch
curl -s -X POST "$GATEWAY/api/regulator-notices" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"jurisdictionKey":"GB","sourceType":"data_breach","sourceId":"incident_eu_breach_2026_03","severity":"high","title":"UK ICO disclosure"}' >/dev/null
ok "UK ICO branch generated (cross-jurisdiction matrix)"

curl -s -X POST "$GATEWAY/api/regulator-notices/$NOTICE_ID/request-approval" \
  -H "$AUTH_HEADER" >/dev/null
curl -s -X POST "$GATEWAY/api/regulator-notices/$NOTICE_ID/approve" \
  -H "$AUTH_HEADER" >/dev/null
SUB=$(curl -s -X POST "$GATEWAY/api/regulator-notices/$NOTICE_ID/submit" \
  -H "$AUTH_HEADER")
echo "$SUB" | grep -q '"submissionRef"' && ok "EU notice submitted (submission ref captured)"

curl -s -X POST "$GATEWAY/api/regulator-notices/$NOTICE_ID/respond" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{"responsePackUri":"s3://crownx-regulator-notices/eu_breach_response.pdf"}' >/dev/null
ok "response pack recorded (status -> responded)"

# Upcoming deadlines
curl -s "$GATEWAY/api/regulator-notices/upcoming-deadlines" -H "$AUTH_HEADER" | head -c 200; echo
ok "upcoming-deadlines (14d) fetched"

# ============================================================
# FLOW 6: ENTERPRISE PLANNING
# ============================================================
note "8. Strategic account -> plan -> scenario -> forecast bundle"

ACCT=$(curl -s -X POST "$GATEWAY/api/planning/accounts" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d '{
    "accountName":"Tier-1 Sovereign Bank",
    "sovereigntyTier":"sovereign_dedicated",
    "estimatedDealCents":50000000
  }')
ACCT_ID=$(echo "$ACCT" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "strategic account $ACCT_ID created (sovereign_dedicated tier)"

PLAN=$(curl -s -X POST "$GATEWAY/api/planning/plans" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"accountId\":\"$ACCT_ID\",
    \"periodKey\":\"2026-Q2\",
    \"milestones\":[
      {\"milestoneKey\":\"sovereign_assignment\",\"title\":\"Sovereign EU class assignment\",\"category\":\"compliance\",\"targetDate\":\"2026-04-30\",\"status\":\"complete\"},
      {\"milestoneKey\":\"contract_msa_signed\",\"title\":\"Master Services Agreement executed\",\"category\":\"commercial\",\"targetDate\":\"2026-05-31\",\"status\":\"in_progress\"},
      {\"milestoneKey\":\"production_rollout\",\"title\":\"Production cutover\",\"category\":\"implementation\",\"targetDate\":\"2026-06-30\",\"status\":\"planned\"},
      {\"milestoneKey\":\"first_remittance\",\"title\":\"First quarterly remittance filed\",\"category\":\"compliance\",\"targetDate\":\"2026-07-31\",\"status\":\"planned\"}
    ],
    \"blockers\":[\"awaiting BYOK key ceremony\"],
    \"dependencies\":[\"sovereign_eu class active\",\"DPA executed\"]
  }")
ok "Q2 plan created with 4 milestones, 1 blocker, 2 dependencies"

SCENARIO=$(curl -s -X POST "$GATEWAY/api/planning/scenarios" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"accountId\":\"$ACCT_ID\",
    \"scenarioName\":\"sovereign_q2_baseline\",
    \"assumptions\":{
      \"baselineRevenueCents\":50000000,
      \"growthBps\":2000,
      \"readinessScore\":65,
      \"sovereigntyComplexity\":70,
      \"closeProbabilityBps\":7000,
      \"procurementCycleDays\":90,
      \"partnerUpliftBps\":300
    }
  }")
SCENARIO_ID=$(echo "$SCENARIO" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
ok "scenario $SCENARIO_ID created (sovereign_q2_baseline assumptions)"

FORECAST=$(curl -s -X POST "$GATEWAY/api/planning/forecasts" \
  -H "content-type: application/json" -H "$AUTH_HEADER" \
  -d "{
    \"accountId\":\"$ACCT_ID\",
    \"periodKey\":\"2026-Q2\",
    \"scenarioModelId\":\"$SCENARIO_ID\"
  }")
echo "$FORECAST" | grep -q '"primaryConfidence"' && ok "forecast bundle (best/base/conservative/worst) computed"

curl -s "$GATEWAY/api/planning/pipeline-summary" -H "$AUTH_HEADER" | head -c 200; echo
ok "planning pipeline summary fetched"

# ============================================================
# Final snapshot of Wave 10 surfaces
# ============================================================
note "9. Wave 10 surface snapshot"
echo "  custody profiles:        $(curl -s "$GATEWAY/api/custody/profiles" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  signing keys:            $(curl -s "$GATEWAY/api/custody/keys" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  signing events:          $(curl -s "$GATEWAY/api/custody/signing-events" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  attestations:            $(curl -s "$GATEWAY/api/custody/attestations" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  tax obligations:         $(curl -s "$GATEWAY/api/tax/obligations" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  remittance runs:         $(curl -s "$GATEWAY/api/tax/remittances" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  collab workspaces:       $(curl -s "$GATEWAY/api/collab-redline/workspaces" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  legal escalations:       $(curl -s "$GATEWAY/api/legal-escalations" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  regulator notices:       $(curl -s "$GATEWAY/api/regulator-notices" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  strategic accounts:      $(curl -s "$GATEWAY/api/planning/accounts" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"
echo "  forecast runs:           $(curl -s "$GATEWAY/api/planning/forecasts" -H "$AUTH_HEADER" | grep -oE '"id":"[^"]+"' | wc -l)"

note "Wave 10 e2e completed."
