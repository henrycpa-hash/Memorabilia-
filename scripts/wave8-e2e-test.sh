#!/usr/bin/env bash
# CrownX Jewel — Wave 8 end-to-end manual test script.
#
# Exercises Wave 8 enterprise revenue / signature / partner-economics /
# privacy / residency / legal / procurement flows:
#   register users → create tenant → close billing statement → ingest receivable
#   run dunning cadence (with manipulated due-dates) → promise-to-pay → write-off
#   create agreement → create signature envelope → simulate signer callbacks
#     → envelope completion auto-advances Wave 7 contract to "active/fully_signed"
#   create revenue-share tree → calculate waterfall on a settlement amount
#     → build partner statement
#   create privacy policy → evaluate release with cohort/k-anon thresholds
#   create residency assignment → evaluate store/process/export actions
#   create legal matter → export packet → place legal hold → release hold
#   create procurement response → save answers → reuse suggestions → submit
#
# Boot the stack:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave8-e2e-test.sh

set -euo pipefail

GATEWAY="${GATEWAY:-http://localhost:4000}"

reg() { curl -s -X POST "$GATEWAY/api/register" -H 'content-type: application/json' -d "$1"; }
login() { curl -s -X POST "$GATEWAY/api/login" -H 'content-type: application/json' -d "$1"; }
regOrLogin() {
  local body="$1" email pw
  email=$(echo "$body" | jq -r '.email')
  pw=$(echo "$body" | jq -r '.password')
  local r
  r=$(reg "$body")
  if [ "$(echo "$r" | jq -r '.accessToken // empty')" = "" ]; then
    r=$(login "{\"email\":\"$email\",\"password\":\"$pw\"}")
  fi
  echo "$r"
}

echo "==> 1. Register admin"
ADMIN=$(regOrLogin '{"email":"w8-admin@example.com","displayName":"Wave8 Admin","password":"Pass1234!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.accessToken')

echo "==> 2. Create tenant"
TENANT=$(curl -s -X POST "$GATEWAY/api/tenants" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"slug":"globalcorp","name":"GlobalCorp Inc.","branding":{"displayName":"GlobalCorp Inc."}}')
TENANT_ID=$(echo "$TENANT" | jq -r '.id')
echo "    tenant.id          = $TENANT_ID"

echo "==> 3. Collections: create receivable + run dunning + promise-to-pay + write-off"
PAST_DUE=$(date -u -d "-65 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v -65d +"%Y-%m-%dT%H:%M:%SZ")
RCV=$(curl -s -X POST "$GATEWAY/api/collections/receivables" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"statementId\":\"stmt_w8_demo\",\"amountDueCents\":250000,\"dueDate\":\"$PAST_DUE\"}")
RCV_ID=$(echo "$RCV" | jq -r '.id')
echo "    receivable.id       = $RCV_ID  bucket=$(echo "$RCV" | jq -r '.agingBucket')  daysPastDue=$(echo "$RCV" | jq -r '.daysPastDue')"

DUNNING=$(curl -s -X POST "$GATEWAY/api/collections/dunning/run" -H "authorization: Bearer $ADMIN_TOKEN")
echo "    dunning runs        = $(echo "$DUNNING" | jq -r '.executed') executions"
echo "    steps               = $(echo "$DUNNING" | jq -c '[.runs[] | {step: .cadenceStep, channel: .channel, template: .templateKey}]')"

PROMISE_DATE=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +7d +"%Y-%m-%dT%H:%M:%SZ")
P2P=$(curl -s -X POST "$GATEWAY/api/collections/receivables/$RCV_ID/promise-to-pay" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"promisedAmountCents\":250000,\"promisedDate\":\"$PROMISE_DATE\",\"notes\":\"Will pay after Q3 close\"}")
P2P_ID=$(echo "$P2P" | jq -r '.id')

# Apply partial payment to a separate receivable, then write-off remaining
WO_RCV=$(curl -s -X POST "$GATEWAY/api/collections/receivables" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"statementId\":\"stmt_w8_writeoff\",\"amountDueCents\":50000,\"dueDate\":\"$PAST_DUE\"}")
WO_RCV_ID=$(echo "$WO_RCV" | jq -r '.id')
WO=$(curl -s -X POST "$GATEWAY/api/collections/receivables/$WO_RCV_ID/writeoffs" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"amountCents":50000,"reason":"Tenant ceased operations"}')
WO_ID=$(echo "$WO" | jq -r '.id')
curl -s -X POST "$GATEWAY/api/collections/writeoffs/$WO_ID/approve" -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null

SUMMARY=$(curl -s "$GATEWAY/api/collections/tenant-summary/$TENANT_ID")
echo "    tenant summary      = open=\$$(echo "$SUMMARY" | jq -r '.totalOpenCents | (./100)')  byBucket=$(echo "$SUMMARY" | jq -c '.byBucket')"

echo "==> 4. Signature: create envelope + simulate signing flow → contract auto-signs"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EXP_ISO=$(date -u -d "+365 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +365d +"%Y-%m-%dT%H:%M:%SZ")
AGREEMENT=$(curl -s -X POST "$GATEWAY/api/contracts/agreements" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"agreementType\":\"institution_platform\",\"counterpartyType\":\"institution\",\"counterpartyName\":\"GlobalCorp Athletics\",\"effectiveDate\":\"$NOW_ISO\",\"expirationDate\":\"$EXP_ISO\",\"termsJson\":{}}")
AGREEMENT_ID=$(echo "$AGREEMENT" | jq -r '.id')
curl -s -X POST "$GATEWAY/api/contracts/agreements/$AGREEMENT_ID/approve" -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null
echo "    agreement.id        = $AGREEMENT_ID"

ENV=$(curl -s -X POST "$GATEWAY/api/signatures/envelopes" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"agreementId\":\"$AGREEMENT_ID\",
    \"provider\":\"docusign\",
    \"subject\":\"GlobalCorp Athletics — Institution Platform Agreement\",
    \"signers\":[
      {\"signerName\":\"Alice CEO\",\"signerEmail\":\"alice@globalcorp.com\",\"signerRole\":\"counter_signer\",\"signingOrder\":1},
      {\"signerName\":\"Bob Counsel\",\"signerEmail\":\"bob@crownxjewel.com\",\"signerRole\":\"initial_signer\",\"signingOrder\":2}
    ]
  }")
ENV_ID=$(echo "$ENV" | jq -r '.envelope.id')
echo "    envelope.id         = $ENV_ID  status=$(echo "$ENV" | jq -r '.envelope.status')"

curl -s -X POST "$GATEWAY/api/signatures/envelopes/$ENV_ID/send" -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null
curl -s -X POST "$GATEWAY/api/signatures/envelopes/$ENV_ID/callbacks" \
  -H 'content-type: application/json' \
  -d '{"callbackType":"signer_signed","signerEmail":"alice@globalcorp.com"}' >/dev/null
COMPLETED=$(curl -s -X POST "$GATEWAY/api/signatures/envelopes/$ENV_ID/callbacks" \
  -H 'content-type: application/json' \
  -d '{"callbackType":"signer_signed","signerEmail":"bob@crownxjewel.com"}')
echo "    after both signed   = $(echo "$COMPLETED" | jq -r '.envelope.status')  uri=$(echo "$COMPLETED" | jq -r '.envelope.signedArtifactUri')"

# Verify Wave 7 contract was auto-advanced to active/fully_signed
AGREEMENT_AFTER=$(curl -s "$GATEWAY/api/contracts/agreements/$AGREEMENT_ID")
echo "    contract status     = $(echo "$AGREEMENT_AFTER" | jq -r '.status')  signature=$(echo "$AGREEMENT_AFTER" | jq -r '.signatureState')"

echo "==> 5. Revenue share: tree + waterfall + partner statement"
TREE=$(curl -s -X POST "$GATEWAY/api/revshare/trees" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"scopeType\":\"tenant\",
    \"scopeId\":\"$TENANT_ID\",
    \"name\":\"GlobalCorp standard 70/20/10 split\",
    \"effectiveDate\":\"$NOW_ISO\",
    \"rules\":{
      \"rootCurrency\":\"USD\",
      \"splits\":[
        {\"beneficiaryId\":\"creator_demo\",\"beneficiaryRole\":\"creator\",\"percentage\":70},
        {\"beneficiaryId\":\"agency_demo\",\"beneficiaryRole\":\"agency\",\"percentage\":20,\"minimumGuaranteeCents\":100000},
        {\"beneficiaryId\":\"platform\",\"beneficiaryRole\":\"platform\",\"percentage\":10}
      ]
    }
  }")
TREE_ID=$(echo "$TREE" | jq -r '.id')

CALC=$(curl -s -X POST "$GATEWAY/api/revshare/calculate" \
  -H 'content-type: application/json' \
  -d "{\"scopeType\":\"tenant\",\"scopeId\":\"$TENANT_ID\",\"referenceType\":\"settlement\",\"referenceId\":\"settlement_w8_demo\",\"totalCents\":1000000}")
echo "    calc.id             = $(echo "$CALC" | jq -r '.id')"
echo "    waterfall outcomes  = $(echo "$CALC" | jq -c '[.outcomes[] | {role: .beneficiaryRole, amount: .amountCents}]')"
echo "    remainder           = $(echo "$CALC" | jq -r '.remainderCents') cents"

# Partner statement for agency
PERIOD_START=$(date -u -d "-30 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v -30d +"%Y-%m-%dT%H:%M:%SZ")
PSTMT=$(curl -s -X POST "$GATEWAY/api/revshare/partner-statements" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"partnerId\":\"agency_demo\",\"periodStart\":\"$PERIOD_START\",\"periodEnd\":\"$NOW_ISO\"}")
echo "    partner stmt total  = \$$(echo "$PSTMT" | jq -r '.totalCents | (./100)')  lineItems=$(echo "$PSTMT" | jq '.lineItems | length')"

echo "==> 6. Privacy: policy + release checks (above + below cohort min)"
POLICY=$(curl -s -X POST "$GATEWAY/api/privacy/policies" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name":"GlobalCorp tenant privacy policy",
    "scopeType":"tenant",
    "scopeId":"'"$TENANT_ID"'",
    "rules":[{
      "ruleKey":"strict_release",
      "description":"Min cohort 10 / k-anon 5 / max class tenant_scoped",
      "minCohortSize":10,
      "kAnonymityThreshold":5,
      "maxPrivacyClass":"tenant_scoped",
      "metricBlacklist":["raw_pii_export"]
    }]
  }')
echo "    policy.id           = $(echo "$POLICY" | jq -r '.id')"

ALLOWED=$(curl -s -X POST "$GATEWAY/api/privacy/release-checks" \
  -H 'content-type: application/json' \
  -d "{\"scopeType\":\"tenant\",\"scopeId\":\"$TENANT_ID\",\"subject\":{\"metricKey\":\"gmv_completed\",\"cohortSize\":50,\"kAnonymity\":12,\"privacyClass\":\"tenant_scoped\"}}")
echo "    above-threshold     = $(echo "$ALLOWED" | jq -r '.decision')"

SUPPRESSED=$(curl -s -X POST "$GATEWAY/api/privacy/release-checks" \
  -H 'content-type: application/json' \
  -d "{\"scopeType\":\"tenant\",\"scopeId\":\"$TENANT_ID\",\"subject\":{\"metricKey\":\"gmv_completed\",\"cohortSize\":3,\"kAnonymity\":2,\"privacyClass\":\"tenant_scoped\"}}")
echo "    below-threshold     = $(echo "$SUPPRESSED" | jq -r '.decision')  reasons=$(echo "$SUPPRESSED" | jq -c '.suppressionReasons')"

DENIED=$(curl -s -X POST "$GATEWAY/api/privacy/release-checks" \
  -H 'content-type: application/json' \
  -d "{\"scopeType\":\"tenant\",\"scopeId\":\"$TENANT_ID\",\"subject\":{\"metricKey\":\"raw_pii_export\",\"cohortSize\":100,\"privacyClass\":\"public\"}}")
echo "    blacklisted         = $(echo "$DENIED" | jq -r '.decision')"

echo "==> 7. Residency: assign EU region + evaluate actions"
REGIONS=$(curl -s "$GATEWAY/api/residency/regions")
EU_REGION_ID=$(echo "$REGIONS" | jq -r '.[] | select(.regionKey=="eu_west") | .id')
echo "    eu_west.id          = $EU_REGION_ID"

ASSIGN=$(curl -s -X POST "$GATEWAY/api/residency/assignments" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"regionId\":\"$EU_REGION_ID\"}")
echo "    assignment.id       = $(echo "$ASSIGN" | jq -r '.id')"

# Evaluate allowed (storage in EU)
ALLOW_STORE=$(curl -s -X POST "$GATEWAY/api/residency/evaluate" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"subjectType\":\"asset\",\"subjectId\":\"asset_w8\",\"action\":\"store\",\"targetRegion\":\"eu_west\"}")
echo "    store eu_west       = $(echo "$ALLOW_STORE" | jq -r '.evaluation.result')"

# Evaluate denied (storage in US for EU tenant)
DENY_STORE=$(curl -s -X POST "$GATEWAY/api/residency/evaluate" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"subjectType\":\"asset\",\"subjectId\":\"asset_w8\",\"action\":\"store\",\"targetRegion\":\"us_east\"}")
echo "    store us_east       = $(echo "$DENY_STORE" | jq -r '.evaluation.result')"

# Evaluate denied (export across boundary)
DENY_EXPORT=$(curl -s -X POST "$GATEWAY/api/residency/evaluate" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"subjectType\":\"asset\",\"subjectId\":\"asset_w8\",\"action\":\"export\",\"targetRegion\":\"us_east\",\"sourceRegion\":\"eu_west\"}")
echo "    export EU→US        = $(echo "$DENY_EXPORT" | jq -r '.evaluation.result')"

echo "==> 8. Legal connector: matter + export packet + legal hold"
# Create a packet first to export
PACKET=$(curl -s -X POST "$GATEWAY/api/legal-packets" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"packetType\":\"dispute_packet\",\"subjectType\":\"tenant\",\"subjectId\":\"$TENANT_ID\"}")
PACKET_ID=$(echo "$PACKET" | jq -r '.id')
curl -s -X POST "$GATEWAY/api/legal-packets/$PACKET_ID/assemble" -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null

MATTER=$(curl -s -X POST "$GATEWAY/api/legal-connector/matters" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"externalMatterId\":\"GLOBALCORP-2026-001\",
    \"provider\":\"ironclad\",
    \"matterTitle\":\"GlobalCorp Athletics — Vendor Dispute\",
    \"associatedAgreementIds\":[\"$AGREEMENT_ID\"]
  }")
MATTER_ID=$(echo "$MATTER" | jq -r '.id')
echo "    matter.id           = $MATTER_ID"

LEXP=$(curl -s -X POST "$GATEWAY/api/legal-connector/matters/$MATTER_ID/exports" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"packetId\":\"$PACKET_ID\"}")
echo "    legal export        = status=$(echo "$LEXP" | jq -r '.status')  uri=$(echo "$LEXP" | jq -r '.outputUri')"

HOLD=$(curl -s -X POST "$GATEWAY/api/legal-connector/matters/$MATTER_ID/holds" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"custodianIds":["alice@globalcorp.com","bob@crownxjewel.com"],"description":"Preserve all comms for active dispute"}')
HOLD_ID=$(echo "$HOLD" | jq -r '.id')
echo "    hold.id             = $HOLD_ID  status=$(echo "$HOLD" | jq -r '.status')"
curl -s -X POST "$GATEWAY/api/legal-connector/holds/$HOLD_ID/release" -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null

echo "==> 9. Procurement: questionnaire + response + reuse + submit"
# List the seeded vendor security questionnaire
QS=$(curl -s "$GATEWAY/api/procurement/questionnaires/by-template/vendor_security_general")
QS_ID=$(echo "$QS" | jq -r '.id')
echo "    questionnaire.id    = $QS_ID  questions=$(echo "$QS" | jq '.questions | length')"

# First response — partial answers
RESP1=$(curl -s -X POST "$GATEWAY/api/procurement/responses" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"questionnaireId\":\"$QS_ID\",\"tenantId\":\"$TENANT_ID\",\"buyerName\":\"AcmeBuyer Q1\"}")
RESP1_ID=$(echo "$RESP1" | jq -r '.id')
curl -s -X PUT "$GATEWAY/api/procurement/responses/$RESP1_ID/answers" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"answers":[
    {"questionKey":"vsq_1","value":"yes","evidenceRef":"audit:soc2_2026"},
    {"questionKey":"vsq_2","value":"AES-256 at rest, TLS 1.3 in transit"},
    {"questionKey":"vsq_3","value":"yes"},
    {"questionKey":"vsq_4","value":"AWS us-east-1, encrypted EBS","evidenceRef":"docs:residency_policy"},
    {"questionKey":"vsq_5","value":"AWS, Stripe, Postmark"},
    {"questionKey":"vsq_6","value":"4-hour acknowledgement, 24-hour mitigation"}
  ]}' >/dev/null
SUBMITTED=$(curl -s -X POST "$GATEWAY/api/procurement/responses/$RESP1_ID/submit" -H "authorization: Bearer $ADMIN_TOKEN")
echo "    response 1 status   = $(echo "$SUBMITTED" | jq -r '.response.status')  completeness=$(echo "$SUBMITTED" | jq -r '.score.completenessPct')% evidence=$(echo "$SUBMITTED" | jq -r '.score.evidenceCoveragePct')%"

# Second response — should suggest reuse from first
RESP2=$(curl -s -X POST "$GATEWAY/api/procurement/responses" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"questionnaireId\":\"$QS_ID\",\"tenantId\":\"$TENANT_ID\",\"buyerName\":\"NextBuyer Q2\"}")
RESP2_ID=$(echo "$RESP2" | jq -r '.id')
REUSE=$(curl -s "$GATEWAY/api/procurement/responses/$RESP2_ID/reuse-suggestions")
echo "    reuse suggestions   = $(echo "$REUSE" | jq 'length') from prior responses"

echo "==> 10. Snapshot of new Wave 8 surfaces"
echo "    receivables          = $(curl -s "$GATEWAY/api/collections/receivables" | jq 'length')"
echo "    dunning runs         = $(curl -s "$GATEWAY/api/collections/dunning/runs" | jq 'length')"
echo "    write-offs           = $(curl -s "$GATEWAY/api/collections/writeoffs" | jq 'length')"
echo "    envelopes            = $(curl -s "$GATEWAY/api/signatures/envelopes" | jq 'length')"
echo "    revshare trees       = $(curl -s "$GATEWAY/api/revshare/trees" | jq 'length')"
echo "    revshare calcs       = $(curl -s "$GATEWAY/api/revshare/calculations" | jq 'length')"
echo "    partner statements   = $(curl -s "$GATEWAY/api/revshare/partner-statements" | jq 'length')"
echo "    privacy policies     = $(curl -s "$GATEWAY/api/privacy/policies" | jq 'length')"
echo "    privacy checks       = $(curl -s "$GATEWAY/api/privacy/release-checks" | jq 'length')"
echo "    residency regions    = $(curl -s "$GATEWAY/api/residency/regions" | jq 'length')"
echo "    residency evals      = $(curl -s "$GATEWAY/api/residency/evaluations" | jq 'length')"
echo "    residency denials    = $(curl -s "$GATEWAY/api/residency/evaluations/denials" | jq 'length')"
echo "    legal matters        = $(curl -s "$GATEWAY/api/legal-connector/matters" | jq 'length')"
echo "    legal exports        = $(curl -s "$GATEWAY/api/legal-connector/exports" | jq 'length')"
echo "    procurement Qs       = $(curl -s "$GATEWAY/api/procurement/questionnaires" | jq 'length')"
echo "    procurement responses= $(curl -s "$GATEWAY/api/procurement/responses" | jq 'length')"

echo
echo "✅ Wave 8 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault"
echo "     http://localhost:3004  — public story"
echo "     http://localhost:3005  — market web"
echo "     http://localhost:3006  — ops console"
echo "     http://localhost:3007  — institutional reporting"
echo "     http://localhost:3011  — compliance control"
echo "     http://localhost:3012  — procurement governance"
echo "     http://localhost:3016  — collections operations (NEW Wave 8)"
