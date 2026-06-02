#!/usr/bin/env bash
# CrownX Jewel — Wave 7 end-to-end manual test script.
#
# Exercises Wave 7 enterprise procurement-grade flow:
#   register users → create tenant → SSO provider + role mapping + SCIM sync
#   billing plan → subscription → record usage → close statement → entitlement check
#   ERP profile → push journal export → ack reconciliation feedback
#   draft agreement → approve → sign → amendment → obligations
#   policy sandbox simulation with variants → variance explanation
#   federated peer group + benchmark run with privacy enforcement
#   SLA profile + observation → breach detection → resolve
#   legal procurement packet → assemble → delivered
#
# Boot the stack:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave7-e2e-test.sh

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

echo "==> 1. Register admin"
ADMIN=$(regOrLogin '{"email":"w7-admin@example.com","displayName":"Wave7 Admin","password":"Pass1234!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.accessToken')

echo "==> 2. Create enterprise tenant"
TENANT=$(curl -s -X POST "$GATEWAY/api/tenants" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"slug":"acme-enterprise","name":"Acme Enterprise","branding":{"displayName":"Acme Enterprise"}}')
TENANT_ID=$(echo "$TENANT" | jq -r '.id')
echo "    tenant.id = $TENANT_ID"

echo "==> 3. Configure SSO provider + role mappings + SCIM sync"
PROVIDER=$(curl -s -X POST "$GATEWAY/api/sso/providers" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"tenantId\":\"$TENANT_ID\",
    \"providerType\":\"okta\",
    \"issuer\":\"https://acme.okta.com\",
    \"domains\":[\"acme.com\",\"acme-enterprise.com\"]
  }")
PROVIDER_ID=$(echo "$PROVIDER" | jq -r '.id')
echo "    provider.id = $PROVIDER_ID"

# Add role mappings
for mapping in '{"externalGroup":"acme-admins","internalRole":"admin"}' \
               '{"externalGroup":"acme-finance","internalRole":"finance"}' \
               '{"externalGroup":"acme-creators","internalRole":"creator"}'; do
  curl -s -X POST "$GATEWAY/api/sso/providers/$PROVIDER_ID/role-mappings" \
    -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
    -d "$mapping" >/dev/null
done

# Domain resolution check
DOMAIN_LOOKUP=$(curl -s "$GATEWAY/api/sso/resolve-domain?email=alice@acme.com")
echo "    domain alice@acme.com → provider $(echo "$DOMAIN_LOOKUP" | jq -r '.id')"

# SCIM sync
SCIM=$(curl -s -X POST "$GATEWAY/api/sso/providers/$PROVIDER_ID/scim/sync" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "payload":[
      {"externalUserId":"u-alice","email":"alice@acme.com","givenName":"Alice","familyName":"A","active":true,"groups":["acme-admins"]},
      {"externalUserId":"u-bob","email":"bob@acme.com","givenName":"Bob","familyName":"B","active":true,"groups":["acme-finance"]},
      {"externalUserId":"u-carol","email":"carol@acme.com","givenName":"Carol","familyName":"C","active":true,"groups":["acme-creators","acme-admins"]},
      {"externalUserId":"u-dave","email":"dave@acme.com","givenName":"Dave","familyName":"D","active":false,"groups":[]}
    ]
  }')
echo "    SCIM run: created=$(echo "$SCIM" | jq -r '.createdUsers') updated=$(echo "$SCIM" | jq -r '.updatedUsers') deactivated=$(echo "$SCIM" | jq -r '.deactivatedUsers') status=$(echo "$SCIM" | jq -r '.status')"

# Build session claims
SESSION=$(curl -s -X POST "$GATEWAY/api/sso/providers/$PROVIDER_ID/sessions/build" \
  -H 'content-type: application/json' \
  -d '{"claims":{"email":"alice@acme.com","externalUserId":"u-alice","externalGroups":["acme-admins"]}}')
echo "    session for alice = roles=$(echo "$SESSION" | jq -c '.internalRoles')"

echo "==> 4. Billing: assign enterprise plan + record usage + close statement"
PLAN=$(curl -s "$GATEWAY/api/billing/plans/by-key/enterprise")
PLAN_ID=$(echo "$PLAN" | jq -r '.id')
echo "    enterprise plan.id = $PLAN_ID"

SUB=$(curl -s -X POST "$GATEWAY/api/billing/subscriptions" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"planId\":\"$PLAN_ID\"}")
SUB_ID=$(echo "$SUB" | jq -r '.id')
echo "    subscription.id    = $SUB_ID"

# Record usage that exceeds the included quota for settlements (10000) → produces overage
for n in 1 2 3 4 5; do
  curl -s -X POST "$GATEWAY/api/billing/usage" \
    -H 'content-type: application/json' \
    -d "{\"tenantId\":\"$TENANT_ID\",\"usageType\":\"settlements_count\",\"quantity\":2500,\"referenceId\":\"batch_$n\"}" >/dev/null
done
curl -s -X POST "$GATEWAY/api/billing/usage" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"usageType\":\"policy_evaluations\",\"quantity\":50000}" >/dev/null

USAGE=$(curl -s "$GATEWAY/api/billing/usage/by-tenant/$TENANT_ID")
echo "    usage              = $(echo "$USAGE" | jq -c '.')"

STMT=$(curl -s -X POST "$GATEWAY/api/billing/subscriptions/$SUB_ID/close" \
  -H "authorization: Bearer $ADMIN_TOKEN")
echo "    statement total    = \$$(echo "$STMT" | jq -r '.totalCents | (./100)') (overage \$$(echo "$STMT" | jq -r '.overageCents | (./100)'))"

# Entitlement check
ENT=$(curl -s "$GATEWAY/api/billing/entitlements/$TENANT_ID/auctions")
echo "    entitlement auctions: $(echo "$ENT" | jq -r '.granted')"

echo "==> 5. ERP: profile + push export + ack"
ERP_PROFILE=$(curl -s -X POST "$GATEWAY/api/erp/profiles" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"provider\":\"netsuite\",\"name\":\"Acme NetSuite Production\",\"mappingJson\":{\"accountMap\":{\"platform_revenue\":\"4000\",\"royalty_payable\":\"2200\"}}}")
ERP_PROFILE_ID=$(echo "$ERP_PROFILE" | jq -r '.id')
echo "    erp profile.id     = $ERP_PROFILE_ID"

# Push journal export (no source pkg in this demo — row count will be 0)
ERP_EXPORT=$(curl -s -X POST "$GATEWAY/api/erp/profiles/$ERP_PROFILE_ID/exports" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"exportType":"journal_entries"}')
ERP_EXPORT_ID=$(echo "$ERP_EXPORT" | jq -r '.id')
echo "    erp export.id      = $ERP_EXPORT_ID status=$(echo "$ERP_EXPORT" | jq -r '.status')"

# Ack
ACK=$(curl -s -X POST "$GATEWAY/api/erp/exports/$ERP_EXPORT_ID/ack" \
  -H 'content-type: application/json' \
  -d '{"status":"accepted","acceptedRows":42,"rejectedRows":0}')
echo "    ack status         = $(echo "$ACK" | jq -r '.status')"

EXPORT_AFTER=$(curl -s "$GATEWAY/api/erp/exports/$ERP_EXPORT_ID")
echo "    export status now  = $(echo "$EXPORT_AFTER" | jq -r '.status')"

echo "==> 6. Contracts: draft → approve → sign → amend → obligation"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EXP_ISO=$(date -u -d "+365 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +365d +"%Y-%m-%dT%H:%M:%SZ")
DUE_ISO=$(date -u -d "+90 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +90d +"%Y-%m-%dT%H:%M:%SZ")

AGREEMENT=$(curl -s -X POST "$GATEWAY/api/contracts/agreements" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"tenantId\":\"$TENANT_ID\",
    \"agreementType\":\"institution_platform\",
    \"counterpartyType\":\"institution\",
    \"counterpartyName\":\"Acme University Athletics\",
    \"effectiveDate\":\"$NOW_ISO\",
    \"expirationDate\":\"$EXP_ISO\",
    \"termsJson\":{
      \"rightsScope\":{\"territories\":[\"US\"],\"rightsWindowDays\":365},
      \"sponsorshipCaps\":{\"maxRewardUsd\":75000,\"allowedSponsorCategories\":[\"apparel\",\"nutrition\"]}
    }
  }")
AGREEMENT_ID=$(echo "$AGREEMENT" | jq -r '.id')
echo "    agreement.id       = $AGREEMENT_ID status=$(echo "$AGREEMENT" | jq -r '.status')"

curl -s -X POST "$GATEWAY/api/contracts/agreements/$AGREEMENT_ID/approve" \
  -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null
SIGNED=$(curl -s -X POST "$GATEWAY/api/contracts/agreements/$AGREEMENT_ID/sign" \
  -H "authorization: Bearer $ADMIN_TOKEN")
echo "    after sign         = status=$(echo "$SIGNED" | jq -r '.status') signature=$(echo "$SIGNED" | jq -r '.signatureState')"

# Amendment
curl -s -X POST "$GATEWAY/api/contracts/agreements/$AGREEMENT_ID/amendments" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"effectiveDate\":\"$NOW_ISO\",\"changesJson\":{\"sponsorshipCaps.maxRewardUsd\":100000}}" >/dev/null

# Obligation
OBLIGATION=$(curl -s -X POST "$GATEWAY/api/contracts/agreements/$AGREEMENT_ID/obligations" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"obligationType\":\"compliance_report_due\",\"dueDate\":\"$DUE_ISO\",\"ownerRole\":\"compliance_reviewer\"}")
OBLIGATION_ID=$(echo "$OBLIGATION" | jq -r '.id')

DUE=$(curl -s "$GATEWAY/api/contracts/obligations/due-within/120")
echo "    obligations due 120d: $(echo "$DUE" | jq 'length')"

# Resolve governing
GOVERN=$(curl -s -X POST "$GATEWAY/api/contracts/resolve-governing" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"counterpartyType\":\"institution\"}")
echo "    governing matched  = $(echo "$GOVERN" | jq 'length')"

echo "==> 7. Policy sandbox: simulate with 3 variants"
# Use seeded NIL pack from policy-compliance-service
NIL_PACK=$(curl -s "$GATEWAY/api/policies/packs/by-type/nil_general" | jq -r '.[0]')
NIL_PACK_ID=$(echo "$NIL_PACK" | jq -r '.id')

SIM=$(curl -s -X POST "$GATEWAY/api/policy-sandbox/simulations" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"policyPackId\":\"$NIL_PACK_ID\",
    \"subject\":{
      \"subjectType\":\"campaign\",
      \"subjectId\":\"camp_w7_demo\",
      \"text\":\"Athlete-led healthy meal endorsement\",
      \"territory\":\"US\",
      \"rewardUsd\":50000,
      \"participantAgeYears\":21
    },
    \"variants\":[
      {\"variantKey\":\"with_alcohol_term\",\"description\":\"What if we add an alcohol term?\",\"subjectOverrides\":{\"text\":\"Athlete-led alcohol endorsement\"}},
      {\"variantKey\":\"reward_over_cap\",\"description\":\"What if reward is \$200k?\",\"subjectOverrides\":{\"rewardUsd\":200000}},
      {\"variantKey\":\"underage_athlete\",\"description\":\"What if athlete is 16?\",\"subjectOverrides\":{\"participantAgeYears\":16}}
    ]
  }")
echo "    base verdict       = $(echo "$SIM" | jq -r '.outcome.baseResult.result')"
echo "    variant verdicts   = $(echo "$SIM" | jq -c '[.outcome.variantResults[] | {key: .variantKey, result: .result}]')"
echo "    variance           = $(echo "$SIM" | jq -r '.outcome.varianceExplanation')"

# simulate-by-type
SIM_TYPE=$(curl -s -X POST "$GATEWAY/api/policy-sandbox/simulate-by-type" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "policyType":"nil_general",
    "subject":{"subjectType":"campaign","subjectId":"camp_w7_typecheck","text":"Healthy nutrition deal","territory":"US","rewardUsd":40000,"participantAgeYears":20}
  }')
echo "    by-type verdict    = $(echo "$SIM_TYPE" | jq -r '.verdict') across $(echo "$SIM_TYPE" | jq '.simulationsByPack | length') packs"

echo "==> 8. Federated analytics: peer group + benchmark with privacy"
PEER=$(curl -s -X POST "$GATEWAY/api/federated-analytics/peer-groups" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"peerGroupKey\":\"D1_athletics_north\",
    \"scopeType\":\"tenant\",
    \"description\":\"Division I athletics in northern conferences\",
    \"memberIds\":[\"$TENANT_ID\",\"peer_t1\",\"peer_t2\",\"peer_t3\",\"peer_t4\",\"peer_t5\",\"peer_t6\"]
  }")
PEER_ID=$(echo "$PEER" | jq -r '.id')

BENCH=$(curl -s -X POST "$GATEWAY/api/federated-analytics/benchmarks" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"peerGroupId\":\"$PEER_ID\",
    \"requestingTenantId\":\"$TENANT_ID\",
    \"metricKeys\":[\"gmv_completed\",\"campaign_ctr\",\"settlement_hold_rate\"]
  }")
echo "    benchmark.id       = $(echo "$BENCH" | jq -r '.id')"
echo "    members measured   = $(echo "$BENCH" | jq '.resultJson.perMember | length')"
echo "    peer stats emitted = $(echo "$BENCH" | jq '.resultJson.peerStats | length')"
echo "    suppressed metrics = $(echo "$BENCH" | jq -c '.resultJson.privacy.suppressed')"
echo "    min for aggregate  = $(echo "$BENCH" | jq -r '.resultJson.privacy.minMembersForAggregate')"

# Test privacy threshold: tiny peer group → all metrics should land in suppressed
TINY_PEER=$(curl -s -X POST "$GATEWAY/api/federated-analytics/peer-groups" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"peerGroupKey\":\"tiny_peer\",
    \"scopeType\":\"tenant\",
    \"memberIds\":[\"$TENANT_ID\",\"peer_t1\"]
  }")
TINY_PEER_ID=$(echo "$TINY_PEER" | jq -r '.id')
TINY_BENCH=$(curl -s -X POST "$GATEWAY/api/federated-analytics/benchmarks" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"peerGroupId\":\"$TINY_PEER_ID\",\"requestingTenantId\":\"$TENANT_ID\",\"metricKeys\":[\"gmv_completed\"]}")
echo "    tiny peer suppressed = $(echo "$TINY_BENCH" | jq -c '.resultJson.privacy.suppressed') (expect [\"gmv_completed\"])"

echo "==> 9. SLA: profile + observe → breach detection"
SLA_PROFILE=$(curl -s -X POST "$GATEWAY/api/sla/profiles" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"tenantId\":\"$TENANT_ID\",
    \"profileName\":\"Acme Enterprise SLA — Tier 1\",
    \"targets\":{
      \"api_uptime_pct\":99.9,
      \"settlement_completion_hours\":24,
      \"dispute_response_hours\":48,
      \"connector_recovery_minutes\":15
    }
  }")
SLA_PROFILE_ID=$(echo "$SLA_PROFILE" | jq -r '.id')
echo "    sla profile.id     = $SLA_PROFILE_ID"

# Healthy observation
HEALTHY=$(curl -s -X POST "$GATEWAY/api/sla/profiles/$SLA_PROFILE_ID/observations" \
  -H 'content-type: application/json' \
  -d '{"observation":{"api_uptime_pct":99.95,"settlement_completion_hours":12}}')
echo "    healthy obs breaches = $(echo "$HEALTHY" | jq '.breaches | length')"

# Bad observation: uptime drop + slow settlement + slow connector
BAD=$(curl -s -X POST "$GATEWAY/api/sla/profiles/$SLA_PROFILE_ID/observations" \
  -H 'content-type: application/json' \
  -d '{"observation":{"api_uptime_pct":98.0,"settlement_completion_hours":48,"connector_recovery_minutes":30},"payload":{"incidentId":"INC-001"}}')
BREACHES=$(echo "$BAD" | jq -c '.breaches')
echo "    breaches detected  = $(echo "$BAD" | jq '.breaches | length')"
echo "    severities         = $(echo "$BAD" | jq -c '[.breaches[] | {key: .targetKey, sev: .severity, observed: .observed}]')"

OPEN=$(curl -s "$GATEWAY/api/sla/breaches/open")
echo "    open breaches now  = $(echo "$OPEN" | jq 'length')"

# Resolve first breach
FIRST_BREACH_ID=$(echo "$BAD" | jq -r '.breaches[0].id')
curl -s -X POST "$GATEWAY/api/sla/breaches/$FIRST_BREACH_ID/resolve" \
  -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null
OPEN_AFTER=$(curl -s "$GATEWAY/api/sla/breaches/open")
echo "    open after resolve = $(echo "$OPEN_AFTER" | jq 'length')"

echo "==> 10. Legal procurement packet: create + assemble + deliver"
PACKET=$(curl -s -X POST "$GATEWAY/api/legal-packets" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"packetType\":\"procurement_packet\",
    \"subjectType\":\"tenant\",
    \"subjectId\":\"$TENANT_ID\"
  }")
PACKET_ID=$(echo "$PACKET" | jq -r '.id')
echo "    packet.id          = $PACKET_ID status=$(echo "$PACKET" | jq -r '.status')"
echo "    items planned      = $(echo "$PACKET" | jq '.items | length')"

ASSEMBLED=$(curl -s -X POST "$GATEWAY/api/legal-packets/$PACKET_ID/assemble" \
  -H "authorization: Bearer $ADMIN_TOKEN")
echo "    after assemble     = status=$(echo "$ASSEMBLED" | jq -r '.status') uri=$(echo "$ASSEMBLED" | jq -r '.outputUri')"
echo "    item types         = $(echo "$ASSEMBLED" | jq -c '[.items[].itemType]')"

curl -s -X POST "$GATEWAY/api/legal-packets/$PACKET_ID/mark-delivered" \
  -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null

echo "==> 11. Snapshot of new Wave 7 surfaces"
echo "    sso providers          = $(curl -s "$GATEWAY/api/sso/providers" | jq 'length')"
echo "    scim runs              = $(curl -s "$GATEWAY/api/sso/scim/runs" | jq 'length')"
echo "    billing plans          = $(curl -s "$GATEWAY/api/billing/plans" | jq 'length')"
echo "    subscriptions          = $(curl -s "$GATEWAY/api/billing/subscriptions" | jq 'length')"
echo "    statements             = $(curl -s "$GATEWAY/api/billing/statements" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    erp profiles           = $(curl -s "$GATEWAY/api/erp/profiles" | jq 'length')"
echo "    erp exports            = $(curl -s "$GATEWAY/api/erp/exports" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    agreements             = $(curl -s "$GATEWAY/api/contracts/agreements" | jq 'length')"
echo "    legal packets          = $(curl -s "$GATEWAY/api/legal-packets" | jq 'length')"
echo "    policy simulations     = $(curl -s "$GATEWAY/api/policy-sandbox/simulations" | jq 'length')"
echo "    peer groups            = $(curl -s "$GATEWAY/api/federated-analytics/peer-groups" | jq 'length')"
echo "    benchmark runs         = $(curl -s "$GATEWAY/api/federated-analytics/benchmarks" | jq 'length')"
echo "    sla profiles           = $(curl -s "$GATEWAY/api/sla/profiles" | jq 'length')"

echo
echo "✅ Wave 7 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault"
echo "     http://localhost:3004  — public story"
echo "     http://localhost:3005  — market web"
echo "     http://localhost:3006  — ops console"
echo "     http://localhost:3007  — institutional reporting"
echo "     http://localhost:3011  — compliance control"
echo "     http://localhost:3012  — procurement governance (NEW Wave 7)"
