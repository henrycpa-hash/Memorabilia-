#!/usr/bin/env bash
# CrownX Jewel — Wave 5 end-to-end manual test script.
#
# Exercises Wave 5 institution-grade integration:
#   register users → asset → finalize → listing → checkout
#     (Wave 5: payment intent → capture → settlement → shipment label → policy bind)
#   ML inference (high-risk vector) → record outcome
#   ingest tracking event → "delivered"
#   open insurance claim → settlement on_hold
#   resolve claim approved_payout → settlement released
#   create experiment → 5 exposures → 3 conversions → results
#   ingest fan profiles → create CRM segment → materialize → lifecycle journey
#   generate board_executive report
#   social post draft → approve → publish-now → tick worker
#
# Boot the stack:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave5-e2e-test.sh

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

echo "==> 1. Register users (creator, reviewer, admin, buyer)"
CREATOR=$(regOrLogin '{"email":"w5-creator@example.com","displayName":"Wave5 Creator","password":"Pass1234!","role":"creator"}')
CREATOR_TOKEN=$(echo "$CREATOR" | jq -r '.accessToken')
CREATOR_USER_ID=$(echo "$CREATOR" | jq -r '.user.id')

REVIEWER=$(regOrLogin '{"email":"w5-reviewer@example.com","displayName":"Wave5 Reviewer","password":"Pass1234!","role":"authenticator"}')
REVIEWER_TOKEN=$(echo "$REVIEWER" | jq -r '.accessToken')
REVIEWER_USER_ID=$(echo "$REVIEWER" | jq -r '.user.id')

ADMIN=$(regOrLogin '{"email":"w5-admin@example.com","displayName":"Wave5 Admin","password":"Pass1234!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.accessToken')

BUYER=$(regOrLogin '{"email":"w5-buyer@example.com","displayName":"Wave5 Buyer","password":"Pass1234!","role":"fan"}')
BUYER_TOKEN=$(echo "$BUYER" | jq -r '.accessToken')
BUYER_USER_ID=$(echo "$BUYER" | jq -r '.user.id')

echo "==> 2. Creator profile + asset"
CREATOR_PROFILE=$(curl -s -X POST "$GATEWAY/api/creators" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"userId\":\"$CREATOR_USER_ID\",\"publicHandle\":\"@w5creator\",\"creatorType\":\"athlete\"}")
CREATOR_ID=$(echo "$CREATOR_PROFILE" | jq -r '.id')

ASSET=$(curl -s -X POST "$GATEWAY/api/assets" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"originatorId\":\"$CREATOR_ID\",\"currentOwnerId\":\"$CREATOR_USER_ID\",\"assetType\":\"memorabilia\",\"title\":\"Wave5 Champion Belt\",\"description\":\"Title-fight belt\",\"editionType\":\"one_of_one\"}")
ASSET_ID=$(echo "$ASSET" | jq -r '.id')
ASSET_SLUG=$(echo "$ASSET" | jq -r '.slug')

echo "==> 3. Finalize authentication + COA"
INTENT=$(curl -s -X POST "$GATEWAY/api/evidence/upload-intents" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"objectType\":\"video\",\"fileName\":\"signing.mp4\"}")
INTENT_ID=$(echo "$INTENT" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/evidence/complete" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"uploadIntentId\":\"$INTENT_ID\",\"objectType\":\"video\",\"storageUri\":\"s3://b/x.mp4\",\"fileHash\":\"h\",\"capturedAt\":\"2026-04-01T10:00:00Z\"}" >/dev/null

CASE=$(curl -s -X POST "$GATEWAY/api/auth-cases" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"aiScore\":0.97}")
CASE_ID=$(echo "$CASE" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/auth-cases/$CASE_ID/finalize" \
  -H 'content-type: application/json' -H "authorization: Bearer $REVIEWER_TOKEN" \
  -d "{\"reviewerId\":\"$REVIEWER_USER_ID\",\"decisionReason\":\"Verified\",\"assetId\":\"$ASSET_ID\",\"ownerId\":\"$CREATOR_USER_ID\"}" >/dev/null

echo "==> 4. Royalty + listing"
curl -s -X POST "$GATEWAY/api/royalty-rules" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"beneficiaries\":[{\"beneficiaryId\":\"$CREATOR_ID\",\"percentage\":10}]}" >/dev/null

LISTING=$(curl -s -X POST "$GATEWAY/api/listings" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$CREATOR_USER_ID\",\"price\":75000}")
LISTING_ID=$(echo "$LISTING" | jq -r '.id')

echo "==> 5. Wave 5 checkout (payment intent → capture → settlement → shipment + insurance)"
CHECKOUT=$(curl -s -X POST "$GATEWAY/api/checkout" \
  -H 'content-type: application/json' \
  -d "{
    \"listingId\":\"$LISTING_ID\",
    \"buyerId\":\"$BUYER_USER_ID\",
    \"paymentProvider\":\"mock\",
    \"paymentMethodType\":\"card\",
    \"shipping\":{\"fromAddress\":\"100 Sender St\",\"toAddress\":\"200 Buyer Ave\",\"weightOz\":48,\"deliveryMode\":\"signature_required\"}
  }")
ORDER_ID=$(echo "$CHECKOUT" | jq -r '.order.id')
PAYMENT_INTENT_ID=$(echo "$CHECKOUT" | jq -r '.paymentIntent.id')
PAYMENT_STATUS=$(echo "$CHECKOUT" | jq -r '.paymentIntent.status')
SETTLEMENT_ID=$(echo "$CHECKOUT" | jq -r '.settlement.id')
SETTLEMENT_STATE=$(echo "$CHECKOUT" | jq -r '.settlement.settlementState')

echo "    order.id           = $ORDER_ID"
echo "    paymentIntent.id   = $PAYMENT_INTENT_ID"
echo "    paymentStatus      = $PAYMENT_STATUS"
echo "    settlement.id      = $SETTLEMENT_ID"
echo "    settlementState    = $SETTLEMENT_STATE"

sleep 1

echo "==> 6. Verify shipment + insurance auto-bound"
SHIPMENTS=$(curl -s "$GATEWAY/api/shipments/by-settlement/$SETTLEMENT_ID")
SHIPMENT_ID=$(echo "$SHIPMENTS" | jq -r '.[0].id // empty')
SHIPMENT_TRACK=$(echo "$SHIPMENTS" | jq -r '.[0].trackingNumber // empty')
echo "    shipment.id        = $SHIPMENT_ID"
echo "    trackingNumber     = $SHIPMENT_TRACK"

POLICIES=$(curl -s "$GATEWAY/api/insurance/policies/by-asset/$ASSET_ID")
POLICY_ID=$(echo "$POLICIES" | jq -r '.[0].id // empty')
POLICY_NUMBER=$(echo "$POLICIES" | jq -r '.[0].policyNumber // empty')
echo "    policy.id          = $POLICY_ID"
echo "    policyNumber       = $POLICY_NUMBER"

echo "==> 7. ML inference for buyer (HIGH-risk vector)"
ML=$(curl -s -X POST "$GATEWAY/api/ml/inference" \
  -H 'content-type: application/json' \
  -d "{
    \"subjectType\":\"user\",\"subjectId\":\"$BUYER_USER_ID\",
    \"featureVector\":{\"device_overlap\":0.9,\"dispute_rate\":0.6,\"price_deviation\":0.5,\"account_freshness\":0.8}
  }")
echo "    champion score = $(echo "$ML" | jq -r '.champion.score')"
echo "    decision       = $(echo "$ML" | jq -r '.champion.decision')"
echo "    challenger     = $(echo "$ML" | jq -r '.challenger.decision // "(none)"')"
echo "    divergence     = $(echo "$ML" | jq -r '.divergence')"

echo "==> 8. Ingest tracking events: in_transit → delivered"
if [ -n "$SHIPMENT_ID" ]; then
  curl -s -X POST "$GATEWAY/api/shipments/$SHIPMENT_ID/events" \
    -H 'content-type: application/json' \
    -d '{"eventType":"in_transit","description":"Departed origin","location":"Sort Center"}' >/dev/null
  curl -s -X POST "$GATEWAY/api/shipments/$SHIPMENT_ID/events" \
    -H 'content-type: application/json' \
    -d '{"eventType":"delivered","description":"Signed for at door","location":"200 Buyer Ave"}' >/dev/null
  SHIP_STATUS=$(curl -s "$GATEWAY/api/shipments/$SHIPMENT_ID" | jq -r '.status')
  echo "    shipment status now = $SHIP_STATUS"
fi

echo "==> 9. Open an insurance claim (shipment_damaged)"
if [ -n "$POLICY_ID" ]; then
  CLAIM=$(curl -s -X POST "$GATEWAY/api/insurance/claims" \
    -H 'content-type: application/json' \
    -d "{
      \"policyId\":\"$POLICY_ID\",\"settlementId\":\"$SETTLEMENT_ID\",
      \"claimType\":\"shipment_damaged\",\"description\":\"Belt arrived dented\"
    }")
  CLAIM_ID=$(echo "$CLAIM" | jq -r '.id')
  echo "    claim.id            = $CLAIM_ID"
  echo "    claim status        = $(echo "$CLAIM" | jq -r '.status')"

  sleep 1

  SETTLEMENT_NOW=$(curl -s "$GATEWAY/api/settlements/$SETTLEMENT_ID")
  echo "    settlement state    = $(echo "$SETTLEMENT_NOW" | jq -r '.settlementState')"
  echo "    holdReason          = $(echo "$SETTLEMENT_NOW" | jq -r '.holdReason')"

  curl -s -X POST "$GATEWAY/api/insurance/claims/$CLAIM_ID/evidence" \
    -H 'content-type: application/json' \
    -d '{"kind":"photo","uri":"s3://evidence/dent.jpg","note":"Visible dent on left side"}' >/dev/null

  echo "==> 10. Admin resolves claim → approved_payout (releases settlement hold)"
  curl -s -X POST "$GATEWAY/api/insurance/claims/$CLAIM_ID/resolve" \
    -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
    -d '{"status":"approved_payout","note":"Insurer approved direct payout"}' >/dev/null

  sleep 1

  SETTLEMENT_FINAL=$(curl -s "$GATEWAY/api/settlements/$SETTLEMENT_ID")
  echo "    settlement state    = $(echo "$SETTLEMENT_FINAL" | jq -r '.settlementState')"
fi

echo "==> 11. Create + run experiment"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
END_ISO=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +30d +"%Y-%m-%dT%H:%M:%SZ")
EXP=$(curl -s -X POST "$GATEWAY/api/experiments" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"name\":\"Story page hero\",\"targetSurface\":\"story_page_layout\",
    \"hypothesis\":\"Larger hero increases watchlist add rate\",
    \"variants\":[{\"key\":\"control\",\"weight\":50},{\"key\":\"big_hero\",\"weight\":50}],
    \"startAt\":\"$NOW_ISO\",\"endAt\":\"$END_ISO\",\"successMetric\":\"watchlist_add\"
  }")
EXP_ID=$(echo "$EXP" | jq -r '.id')
curl -s -X POST "$GATEWAY/api/experiments/$EXP_ID/start" \
  -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null
echo "    experiment.id = $EXP_ID started"

# 5 exposures
for i in 1 2 3 4 5; do
  curl -s -X POST "$GATEWAY/api/experiments/$EXP_ID/expose" \
    -H 'content-type: application/json' \
    -d "{\"subjectId\":\"subject_$i\"}" >/dev/null
done
# 3 conversions
for i in 1 3 5; do
  curl -s -X POST "$GATEWAY/api/experiments/$EXP_ID/convert" \
    -H 'content-type: application/json' \
    -d "{\"subjectId\":\"subject_$i\",\"metricKey\":\"watchlist_add\"}" >/dev/null
done

RESULTS=$(curl -s "$GATEWAY/api/experiments/$EXP_ID/results")
echo "    totalExposures = $(echo "$RESULTS" | jq -r '.totalExposures')"
echo "    totalConv      = $(echo "$RESULTS" | jq -r '.totalConversions')"
echo "    byVariant      = $(echo "$RESULTS" | jq -c '.byVariant')"

echo "==> 12. Ingest fan profiles + CRM segment"
for i in 1 2 3; do
  curl -s -X POST "$GATEWAY/api/crm/profiles" \
    -H 'content-type: application/json' \
    -d "{
      \"userId\":\"fan_$i\",\"role\":\"fan\",
      \"ownedAssets\":$i,\"watchlistCount\":$((i * 2)),
      \"totalSpend\":$((i * 1000)),\"lastActivityDaysAgo\":$i,
      \"lastPurchaseDaysAgo\":$((i * 10)),
      \"creatorAffinityIds\":[\"$CREATOR_ID\"],
      \"collectorTier\":\"$( [ $i -eq 3 ] && echo high_value || echo engaged )\"
    }" >/dev/null
done

SEGMENT=$(curl -s -X POST "$GATEWAY/api/crm/segments" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"name\":\"Engaged $CREATOR_ID followers\",
    \"description\":\"Fans with watchlist activity in last 30d\",
    \"definition\":{\"role\":\"fan\",\"creatorAffinityId\":\"$CREATOR_ID\",\"lastActivityWithinDays\":30}
  }")
SEGMENT_ID=$(echo "$SEGMENT" | jq -r '.id')
echo "    segment.id = $SEGMENT_ID"

MAT=$(curl -s -X POST "$GATEWAY/api/crm/segments/$SEGMENT_ID/materialize")
echo "    materialized size = $(echo "$MAT" | jq -r '.size')"
echo "    matched userIds   = $(echo "$MAT" | jq -c '.userIds')"

JOURNEY=$(curl -s -X POST "$GATEWAY/api/crm/journeys" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"name\":\"Drop reactivation\",\"segmentId\":\"$SEGMENT_ID\",
    \"triggerEventType\":\"campaign.launched\",\"templateKey\":\"creator_drop_card\"
  }")
echo "    journey.id = $(echo "$JOURNEY" | jq -r '.id')"

echo "==> 13. Generate board executive report"
REPORT=$(curl -s -X POST "$GATEWAY/api/reports" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reportType":"board_executive","format":"json"}')
echo "    report.id      = $(echo "$REPORT" | jq -r '.id')"
echo "    sections       = $(echo "$REPORT" | jq -r '.sections | length')"
echo "    section keys   = $(echo "$REPORT" | jq -c '[.sections[].key]')"

echo "==> 14. Social post: draft → approve → publish-now"
DRAFT=$(curl -s -X POST "$GATEWAY/api/social/posts" \
  -H 'content-type: application/json' -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"channel\":\"twitter\",
    \"text\":\"Champion Belt sold for \$75k 🥇 settled with full chain of custody\",
    \"linkUrl\":\"http://localhost:3004/collectible/$ASSET_SLUG\"
  }")
POST_ID=$(echo "$DRAFT" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/social/posts/$POST_ID/approve" \
  -H "authorization: Bearer $CREATOR_TOKEN" >/dev/null

PUBLISHED=$(curl -s -X POST "$GATEWAY/api/social/posts/$POST_ID/publish-now" \
  -H "authorization: Bearer $CREATOR_TOKEN")
echo "    post.status         = $(echo "$PUBLISHED" | jq -r '.status')"
echo "    externalPostId      = $(echo "$PUBLISHED" | jq -r '.externalPostId')"

# Tick worker — drains any remaining approved/scheduled posts
TICK=$(curl -s -X POST "$GATEWAY/api/social/workers/tick")
echo "    worker tick: published=$(echo "$TICK" | jq -r '.published') failed=$(echo "$TICK" | jq -r '.failed')"

echo "==> 15. Snapshot of new Wave 5 endpoints"
echo "    payments listed        = $(curl -s "$GATEWAY/api/payments/intents" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    shipments listed       = $(curl -s "$GATEWAY/api/shipments" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    policies listed        = $(curl -s "$GATEWAY/api/insurance/policies" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    inference logs         = $(curl -s "$GATEWAY/api/ml/inference/logs" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    experiments running    = $(curl -s "$GATEWAY/api/experiments/running" | jq 'length')"
echo "    segments listed        = $(curl -s "$GATEWAY/api/crm/segments" | jq 'length')"
echo "    reports listed         = $(curl -s "$GATEWAY/api/reports" -H "authorization: Bearer $ADMIN_TOKEN" | jq 'length')"
echo "    social posts published = $(curl -s "$GATEWAY/api/social/posts" | jq '[.[] | select(.status == "published")] | length')"

echo
echo "✅ Wave 5 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault"
echo "     http://localhost:3004/collectible/$ASSET_SLUG  — public story"
echo "     http://localhost:3005  — market web"
echo "     http://localhost:3006  — ops console"
echo "     http://localhost:3007  — institutional reporting (NEW)"
