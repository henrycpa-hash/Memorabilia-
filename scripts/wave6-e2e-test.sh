#!/usr/bin/env bash
# CrownX Jewel — Wave 6 end-to-end manual test script.
#
# Exercises Wave 6 ecosystem integration:
#   register users → tenant w/ branding + policy assignment
#   agency org + 7 members + creator affiliation + approval task multi-role decide
#   partner onboard + inventory sync + map item
#   register carrier connector + invoke success + 5x force_failure trip circuit + reset
#   training labels (mix) + dataset + job + complete + promote candidate as challenger
#   register custom metric + evaluate-all
#   create school policy pack with prohibited "alcohol" → evaluate "alcohol promo" reject
#   issue invoice + build royalty-statements export + download CSV
#
# Boot the stack:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave6-e2e-test.sh

set -euo pipefail

GATEWAY="${GATEWAY:-http://localhost:4000}"

reg() { curl -s -X POST "$GATEWAY/api/register" -H 'content-type: application/json' -d "$1"; }
login() { curl -s -X POST "$GATEWAY/api/login" -H 'content-type: application/json' -d "$1"; }
regOrLogin() {
  local body="$1"
  local email pw
  email=$(echo "$body" | jq -r '.email')
  pw=$(echo "$body" | jq -r '.password')
  local r
  r=$(reg "$body")
  if [ "$(echo "$r" | jq -r '.accessToken // empty')" = "" ]; then
    r=$(login "{\"email\":\"$email\",\"password\":\"$pw\"}")
  fi
  echo "$r"
}

echo "==> 1. Register admin + agency users"
ADMIN=$(regOrLogin '{"email":"w6-admin@example.com","displayName":"Wave6 Admin","password":"Pass1234!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.accessToken')

MANAGER=$(regOrLogin '{"email":"w6-manager@example.com","displayName":"Wave6 Mgr","password":"Pass1234!","role":"creator"}')
MANAGER_TOKEN=$(echo "$MANAGER" | jq -r '.accessToken')
MANAGER_ID=$(echo "$MANAGER" | jq -r '.user.id')

REVIEWER=$(regOrLogin '{"email":"w6-reviewer@example.com","displayName":"Wave6 Compliance","password":"Pass1234!","role":"creator"}')
REVIEWER_TOKEN=$(echo "$REVIEWER" | jq -r '.accessToken')
REVIEWER_ID=$(echo "$REVIEWER" | jq -r '.user.id')

APPROVER=$(regOrLogin '{"email":"w6-approver@example.com","displayName":"Wave6 Approver","password":"Pass1234!","role":"creator"}')
APPROVER_TOKEN=$(echo "$APPROVER" | jq -r '.accessToken')
APPROVER_ID=$(echo "$APPROVER" | jq -r '.user.id')

echo "==> 2. Create a tenant + branding + assign policy"
TENANT=$(curl -s -X POST "$GATEWAY/api/tenants" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"slug":"acme-school","name":"Acme School","branding":{"displayName":"Acme School","primaryColor":"#1d4ed8"}}')
TENANT_ID=$(echo "$TENANT" | jq -r '.id')
echo "    tenant.id          = $TENANT_ID"

# Check default flags
FLAGS=$(curl -s "$GATEWAY/api/tenants/$TENANT_ID/flags")
echo "    default flags      = $(echo "$FLAGS" | jq -c '.')"

curl -s -X POST "$GATEWAY/api/tenants/$TENANT_ID/flags" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"flagKey":"agency_workflows","enabled":true}' >/dev/null
curl -s -X POST "$GATEWAY/api/tenants/$TENANT_ID/flags" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"flagKey":"compliance_packs","enabled":true}' >/dev/null

echo "==> 3. Create agency org + add members + creator affiliation"
ORG=$(curl -s -X POST "$GATEWAY/api/orgs" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"orgType\":\"agency\",\"name\":\"Acme Sports Mgmt\",\"tenantId\":\"$TENANT_ID\"}")
ORG_ID=$(echo "$ORG" | jq -r '.id')
echo "    org.id             = $ORG_ID"

curl -s -X POST "$GATEWAY/api/orgs/$ORG_ID/members" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"userId\":\"$MANAGER_ID\",\"role\":\"manager\"}" >/dev/null
curl -s -X POST "$GATEWAY/api/orgs/$ORG_ID/members" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"userId\":\"$REVIEWER_ID\",\"role\":\"compliance_reviewer\"}" >/dev/null
curl -s -X POST "$GATEWAY/api/orgs/$ORG_ID/members" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"userId\":\"$APPROVER_ID\",\"role\":\"content_approver\"}" >/dev/null

echo "    members            = $(curl -s "$GATEWAY/api/orgs/$ORG_ID/members" | jq 'length')"

curl -s -X POST "$GATEWAY/api/orgs/$ORG_ID/affiliate" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"creatorId":"creator_demo_001"}' >/dev/null

echo "==> 4. Open multi-role campaign approval, decide each"
APPROVALS=$(curl -s -X POST "$GATEWAY/api/orgs/$ORG_ID/approvals" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"aggregateType":"campaign","aggregateId":"camp_demo_001","payloadJson":{"title":"Spring Drop"}}')
echo "    tasks created      = $(echo "$APPROVALS" | jq 'length')"
echo "    roles assigned     = $(echo "$APPROVALS" | jq -c '[.[].assignedRole]')"

REVIEWER_TASK=$(echo "$APPROVALS" | jq -r '[.[] | select(.assignedRole=="compliance_reviewer")][0].id')
APPROVER_TASK=$(echo "$APPROVALS" | jq -r '[.[] | select(.assignedRole=="content_approver")][0].id')

curl -s -X POST "$GATEWAY/api/approvals/$REVIEWER_TASK/decide" \
  -H 'content-type: application/json' -H "authorization: Bearer $REVIEWER_TOKEN" \
  -d '{"decision":"approved"}' >/dev/null
curl -s -X POST "$GATEWAY/api/approvals/$APPROVER_TASK/decide" \
  -H 'content-type: application/json' -H "authorization: Bearer $APPROVER_TOKEN" \
  -d '{"decision":"approved"}' >/dev/null

PENDING=$(curl -s "$GATEWAY/api/orgs/$ORG_ID/approvals/pending")
echo "    pending after      = $(echo "$PENDING" | jq 'length')"

echo "==> 5. Onboard a partner + sync inventory + map first item"
PARTNER=$(curl -s -X POST "$GATEWAY/api/partners" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"partnerType\":\"dealer\",\"name\":\"Heritage Memorabilia\",\"tenantId\":\"$TENANT_ID\",\"configJson\":{\"feedUrl\":\"https://example.com/feed\"}}")
PARTNER_ID=$(echo "$PARTNER" | jq -r '.id')
echo "    partner.id         = $PARTNER_ID"

SYNC=$(curl -s -X POST "$GATEWAY/api/partners/$PARTNER_ID/inventory/sync" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{}')
echo "    fetched/candidate  = $(echo "$SYNC" | jq -c '{fetched, candidate, matched, nextCursor}')"

INV=$(curl -s "$GATEWAY/api/partners/$PARTNER_ID/inventory")
FIRST_INV_ID=$(echo "$INV" | jq -r '.[0].id')

curl -s -X POST "$GATEWAY/api/partners/inventory/$FIRST_INV_ID/map" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"mappedAssetId":"asset_demo_001"}' >/dev/null
MAPPED=$(curl -s "$GATEWAY/api/partners/$PARTNER_ID/inventory" | jq '[.[] | select(.syncState=="matched")] | length')
echo "    mapped items       = $MAPPED"

echo "==> 6. Register a carrier connector + invoke + force failures to trip circuit"
CONNECTOR=$(curl -s -X POST "$GATEWAY/api/connectors" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"kind":"carrier","providerKey":"easypost","displayName":"EasyPost (mock)","configJson":{"region":"us"}}')
CONNECTOR_ID=$(echo "$CONNECTOR" | jq -r '.id')
echo "    connector.id       = $CONNECTOR_ID"

# Initial success
SUCCESS=$(curl -s -X POST "$GATEWAY/api/connectors/$CONNECTOR_ID/invoke" \
  -H 'content-type: application/json' \
  -d '{"operation":"create_label"}')
echo "    success ok=$(echo "$SUCCESS" | jq -r '.ok') circuit=$(echo "$SUCCESS" | jq -r '.circuit')"

# 5 forced failures → trip circuit
for i in 1 2 3 4 5; do
  curl -s -X POST "$GATEWAY/api/connectors/$CONNECTOR_ID/invoke" \
    -H 'content-type: application/json' \
    -d '{"operation":"create_label","forceFailure":true}' >/dev/null
done

HEALTH=$(curl -s "$GATEWAY/api/connectors/$CONNECTOR_ID/health")
echo "    after 5 failures   = circuit=$(echo "$HEALTH" | jq -r '.circuitState') status=$(echo "$HEALTH" | jq -r '.status') consecutive=$(echo "$HEALTH" | jq -r '.consecutiveFailures')"

# Try invoke while open
BLOCKED=$(curl -s -X POST "$GATEWAY/api/connectors/$CONNECTOR_ID/invoke" \
  -H 'content-type: application/json' \
  -d '{"operation":"create_label"}')
echo "    blocked invoke ok=$(echo "$BLOCKED" | jq -r '.ok') message=$(echo "$BLOCKED" | jq -r '.message')"

# Reset
curl -s -X POST "$GATEWAY/api/connectors/$CONNECTOR_ID/reset-circuit" \
  -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null
RESET_HEALTH=$(curl -s "$GATEWAY/api/connectors/$CONNECTOR_ID/health")
echo "    after reset        = circuit=$(echo "$RESET_HEALTH" | jq -r '.circuitState') status=$(echo "$RESET_HEALTH" | jq -r '.status')"

echo "==> 7. Training: add labels, build dataset, run job, promote candidate"
for cls in fraud_confirmed legitimate fraud_suspected legitimate legitimate; do
  curl -s -X POST "$GATEWAY/api/training/labels" \
    -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"subjectType\":\"settlement\",\"subjectId\":\"st_$cls\",\"labelClass\":\"$cls\",\"labelSource\":\"human_review\"}" >/dev/null
done
MIX=$(curl -s "$GATEWAY/api/training/labels/mix")
echo "    label mix          = $(echo "$MIX" | jq -c '.')"

DATASET=$(curl -s -X POST "$GATEWAY/api/training/datasets" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Wave 6 demo dataset"}')
DATASET_ID=$(echo "$DATASET" | jq -r '.id')

JOB=$(curl -s -X POST "$GATEWAY/api/training/jobs" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"datasetId\":\"$DATASET_ID\"}")
JOB_ID=$(echo "$JOB" | jq -r '.id')

COMPLETED=$(curl -s -X POST "$GATEWAY/api/training/jobs/$JOB_ID/complete" \
  -H "authorization: Bearer $ADMIN_TOKEN")
CANDIDATE_ID=$(echo "$COMPLETED" | jq -r '.candidate.id')
echo "    job status         = $(echo "$COMPLETED" | jq -r '.job.status')"
echo "    metrics            = $(echo "$COMPLETED" | jq -c '.job.validationMetrics')"

curl -s -X POST "$GATEWAY/api/training/candidates/$CANDIDATE_ID/promote" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"target":"challenger"}' >/dev/null
echo "    candidate promoted to challenger"

echo "==> 8. Register a custom metric + evaluate all defaults"
curl -s -X POST "$GATEWAY/api/metrics/custom" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "key":"acme_school_engagement_score",
    "label":"Acme School engagement score",
    "category":"growth",
    "source":"warehouse",
    "unit":"ratio",
    "description":"Tenant-specific engagement composite",
    "dimensions":["tenant_id","period_day"],
    "tenantId":"'"$TENANT_ID"'"
  }' >/dev/null
echo "    custom metric registered"

EVAL_ALL=$(curl -s "$GATEWAY/api/metrics/evaluate-all")
echo "    evaluate-all keys  = $(echo "$EVAL_ALL" | jq -c '[.[].metricKey]')"

echo "==> 9. Policy: create school pack, evaluate against alcohol-themed campaign"
SCHOOL_PACK=$(curl -s -X POST "$GATEWAY/api/policies/packs" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "policyType":"school",
    "name":"Acme School NIL pack",
    "version":"1.0.0",
    "rules":[
      {
        "ruleKey":"acme.no_alcohol",
        "description":"No alcohol references in any school NIL deal",
        "prohibitedTerms":["alcohol","beer","wine"]
      },
      {
        "ruleKey":"acme.us_only",
        "description":"US-only territory enforcement",
        "allowedTerritories":["US"]
      },
      {
        "ruleKey":"acme.reward_cap",
        "description":"$50k cap on per-deal reward",
        "maxRewardUsd":50000
      }
    ]
  }')
SCHOOL_PACK_ID=$(echo "$SCHOOL_PACK" | jq -r '.id')

# Bad input → expect reject
REJECTED=$(curl -s -X POST "$GATEWAY/api/policies/evaluate" \
  -H 'content-type: application/json' \
  -d "{
    \"policyPackId\":\"$SCHOOL_PACK_ID\",
    \"subject\":{
      \"subjectType\":\"campaign\",
      \"subjectId\":\"camp_alcohol_001\",
      \"text\":\"Sponsored alcohol promo for charity\",
      \"territory\":\"US\",
      \"rewardUsd\":10000
    },
    \"tenantId\":\"$TENANT_ID\"
  }")
echo "    reject case        = $(echo "$REJECTED" | jq -r '.result') reasons=$(echo "$REJECTED" | jq -c '.reasons')"

# Clean input → expect approve
APPROVED=$(curl -s -X POST "$GATEWAY/api/policies/evaluate" \
  -H 'content-type: application/json' \
  -d "{
    \"policyPackId\":\"$SCHOOL_PACK_ID\",
    \"subject\":{
      \"subjectType\":\"campaign\",
      \"subjectId\":\"camp_clean_002\",
      \"text\":\"Workout supplement endorsement deal\",
      \"territory\":\"US\",
      \"rewardUsd\":15000
    },
    \"tenantId\":\"$TENANT_ID\"
  }")
echo "    approve case       = $(echo "$APPROVED" | jq -r '.result')"

# Cap-exceeded → expect reject
OVERCAP=$(curl -s -X POST "$GATEWAY/api/policies/evaluate" \
  -H 'content-type: application/json' \
  -d "{
    \"policyPackId\":\"$SCHOOL_PACK_ID\",
    \"subject\":{
      \"subjectType\":\"campaign\",
      \"subjectId\":\"camp_overcap_003\",
      \"text\":\"Premium endorsement\",
      \"territory\":\"US\",
      \"rewardUsd\":80000
    },
    \"tenantId\":\"$TENANT_ID\"
  }")
echo "    overcap case       = $(echo "$OVERCAP" | jq -r '.result') reasons=$(echo "$OVERCAP" | jq -c '.reasons')"

# evaluate-by-type — should run against all active school packs
TYPE_RESULT=$(curl -s -X POST "$GATEWAY/api/policies/evaluate-by-type" \
  -H 'content-type: application/json' \
  -d "{
    \"policyType\":\"school\",
    \"subject\":{
      \"subjectType\":\"campaign\",
      \"subjectId\":\"camp_typecheck_004\",
      \"text\":\"Alcohol promo\",
      \"territory\":\"US\"
    }
  }")
echo "    by-type verdict    = $(echo "$TYPE_RESULT" | jq -r '.verdict')"

echo "==> 10. Issue invoice + build royalty-statements export + download CSV"
INVOICE=$(curl -s -X POST "$GATEWAY/api/finance/invoices" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"settlementId\":\"st_demo_001\",
    \"tenantId\":\"$TENANT_ID\",
    \"invoiceType\":\"creator_payout\",
    \"amount\":12345.67,
    \"currency\":\"USD\",
    \"partyId\":\"$MANAGER_ID\"
  }")
echo "    invoice.number     = $(echo "$INVOICE" | jq -r '.invoiceNumber') status=$(echo "$INVOICE" | jq -r '.status')"

EXPORT=$(curl -s -X POST "$GATEWAY/api/finance/exports/royalty-statements" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{}')
EXPORT_ID=$(echo "$EXPORT" | jq -r '.id')
echo "    royalty export.id  = $EXPORT_ID"

EXPORT_JE=$(curl -s -X POST "$GATEWAY/api/finance/exports/journal-entries" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{}')
echo "    journal export.id  = $(echo "$EXPORT_JE" | jq -r '.id')"

echo "    --- CSV preview (first 5 lines) ---"
curl -s "$GATEWAY/api/finance/exports/$EXPORT_ID/csv" \
  -H "authorization: Bearer $ADMIN_TOKEN" | head -n 5 || true

echo "==> 11. Snapshot of new Wave 6 surfaces"
echo "    partners listed       = $(curl -s "$GATEWAY/api/partners" | jq 'length')"
echo "    tenants listed        = $(curl -s "$GATEWAY/api/tenants" | jq 'length')"
echo "    orgs listed           = $(curl -s "$GATEWAY/api/orgs" | jq 'length')"
echo "    connectors listed     = $(curl -s "$GATEWAY/api/connectors" | jq 'length')"
echo "    candidates listed     = $(curl -s "$GATEWAY/api/training/candidates" | jq 'length')"
echo "    metrics defaults      = $(curl -s "$GATEWAY/api/metrics/defaults" | jq 'length')"
echo "    policy packs total    = $(curl -s "$GATEWAY/api/policies/packs" | jq 'length')"
echo "    evaluations total     = $(curl -s "$GATEWAY/api/policies/evaluations" | jq 'length')"
echo "    finance exports       = $(curl -s "$GATEWAY/api/finance/exports" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"

echo
echo "✅ Wave 6 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault"
echo "     http://localhost:3004  — public story"
echo "     http://localhost:3005  — market web"
echo "     http://localhost:3006  — ops console"
echo "     http://localhost:3007  — institutional reporting"
echo "     http://localhost:3011  — compliance control (NEW Wave 6)"
