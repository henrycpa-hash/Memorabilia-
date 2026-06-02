#!/usr/bin/env bash
# CrownX Jewel — Wave 4 end-to-end manual test script.
#
# Exercises Wave 4 institution-grade automation:
#
#   register users → create asset → finalize → publish listing
#   checkout → settlement-service creates settlement (escrow_held / ready_for_release)
#   verify settlement state, ledger entries, payouts
#   evaluate fraud signal → high band auto-raises alert
#   open dispute on the settlement → settlement transitions to on_hold
#   admin resolves dispute (release) → settlement returns to ready_for_release
#   tick settlement-transition worker → settlement → payout_scheduled → completed
#   create + launch a campaign → track click + convert events
#   recompute creator reputation
#   tick render worker → render jobs drain queued → completed
#   trigger automation event manually
#   read warehouse metrics → GMV / dispute rate / settlement hold rate
#   read ops console proxy routes → /api/ops/settlements + /api/ops/disputes
#   create auction → place bid → simulate end-time then tick auction-close worker
#
# Boot the stack:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave4-e2e-test.sh

set -euo pipefail

GATEWAY="${GATEWAY:-http://localhost:4000}"

reg() {
  curl -s -X POST "$GATEWAY/api/register" -H 'content-type: application/json' -d "$1"
}

login() {
  curl -s -X POST "$GATEWAY/api/login" -H 'content-type: application/json' -d "$1"
}

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
CREATOR=$(regOrLogin '{"email":"w4-creator@example.com","displayName":"Wave4 Creator","password":"Pass1234!","role":"creator"}')
CREATOR_TOKEN=$(echo "$CREATOR" | jq -r '.accessToken')
CREATOR_USER_ID=$(echo "$CREATOR" | jq -r '.user.id')

REVIEWER=$(regOrLogin '{"email":"w4-reviewer@example.com","displayName":"Wave4 Reviewer","password":"Pass1234!","role":"authenticator"}')
REVIEWER_TOKEN=$(echo "$REVIEWER" | jq -r '.accessToken')
REVIEWER_USER_ID=$(echo "$REVIEWER" | jq -r '.user.id')

ADMIN=$(regOrLogin '{"email":"w4-admin@example.com","displayName":"Wave4 Admin","password":"Pass1234!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.accessToken')

BUYER=$(regOrLogin '{"email":"w4-buyer@example.com","displayName":"Wave4 Buyer","password":"Pass1234!","role":"fan"}')
BUYER_TOKEN=$(echo "$BUYER" | jq -r '.accessToken')
BUYER_USER_ID=$(echo "$BUYER" | jq -r '.user.id')

echo "==> 2. Creator profile + asset registration"
CREATOR_PROFILE=$(curl -s -X POST "$GATEWAY/api/creators" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"userId\":\"$CREATOR_USER_ID\",\"publicHandle\":\"@w4creator\",\"creatorType\":\"athlete\"}")
CREATOR_ID=$(echo "$CREATOR_PROFILE" | jq -r '.id')

ASSET=$(curl -s -X POST "$GATEWAY/api/assets" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"originatorId\":\"$CREATOR_ID\",
    \"currentOwnerId\":\"$CREATOR_USER_ID\",
    \"assetType\":\"memorabilia\",
    \"title\":\"Wave4 Final Game Jersey\",
    \"description\":\"Game-worn jersey from final\",
    \"editionType\":\"one_of_one\"
  }")
ASSET_ID=$(echo "$ASSET" | jq -r '.id')
ASSET_SLUG=$(echo "$ASSET" | jq -r '.slug')

echo "==> 3. Finalize authentication + COA"
INTENT=$(curl -s -X POST "$GATEWAY/api/evidence/upload-intents" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"objectType\":\"video\",\"fileName\":\"signing.mp4\"}")
INTENT_ID=$(echo "$INTENT" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/evidence/complete" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"uploadIntentId\":\"$INTENT_ID\",\"objectType\":\"video\",\"storageUri\":\"s3://b/x.mp4\",\"fileHash\":\"h\",\"capturedAt\":\"2026-04-01T10:00:00Z\"}" >/dev/null

CASE=$(curl -s -X POST "$GATEWAY/api/auth-cases" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"aiScore\":0.97}")
CASE_ID=$(echo "$CASE" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/auth-cases/$CASE_ID/finalize" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $REVIEWER_TOKEN" \
  -d "{\"reviewerId\":\"$REVIEWER_USER_ID\",\"decisionReason\":\"Verified\",\"assetId\":\"$ASSET_ID\",\"ownerId\":\"$CREATOR_USER_ID\"}" >/dev/null

echo "==> 4. Royalty rule + listing"
curl -s -X POST "$GATEWAY/api/royalty-rules" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"beneficiaries\":[{\"beneficiaryId\":\"$CREATOR_ID\",\"percentage\":10}]}" >/dev/null

LISTING=$(curl -s -X POST "$GATEWAY/api/listings" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$CREATOR_USER_ID\",\"price\":50000}")
LISTING_ID=$(echo "$LISTING" | jq -r '.id')

echo "==> 5. Checkout (Wave 4 — gateway creates settlement)"
CHECKOUT=$(curl -s -X POST "$GATEWAY/api/checkout" \
  -H 'content-type: application/json' \
  -d "{\"listingId\":\"$LISTING_ID\",\"buyerId\":\"$BUYER_USER_ID\"}")
ORDER_ID=$(echo "$CHECKOUT" | jq -r '.order.id')
SETTLEMENT_ID=$(echo "$CHECKOUT" | jq -r '.settlement.id')
SETTLEMENT_STATE=$(echo "$CHECKOUT" | jq -r '.settlement.settlementState')

echo "    order.id          = $ORDER_ID"
echo "    settlement.id     = $SETTLEMENT_ID"
echo "    settlementState   = $SETTLEMENT_STATE"

sleep 1

echo "==> 6. Verify settlement events"
EVENTS=$(curl -s "$GATEWAY/api/settlements/$SETTLEMENT_ID/events")
echo "    events logged = $(echo "$EVENTS" | jq 'length')"
echo "$EVENTS" | jq -r '.[] | "      - " + .eventType'

echo "==> 7. Evaluate fraud signal (high) on the buyer"
FRAUD=$(curl -s -X POST "$GATEWAY/api/fraud/scores" \
  -H 'content-type: application/json' \
  -d "{
    \"subjectType\":\"user\",
    \"subjectId\":\"$BUYER_USER_ID\",
    \"signals\":[\"device_overlap_detected\",\"repeated_bid_ring_pattern\"]
  }")
echo "    score   = $(echo "$FRAUD" | jq -r '.score')"
echo "    band    = $(echo "$FRAUD" | jq -r '.riskBand')"
echo "    reasons = $(echo "$FRAUD" | jq -r '.reasons | join(", ")')"

echo "==> 8. Recompute reputations"
USER_REP=$(curl -s -X POST "$GATEWAY/api/reputation/users/recompute" \
  -H 'content-type: application/json' \
  -d "{\"userId\":\"$BUYER_USER_ID\",\"successfulTrades\":1,\"disputeRate\":0,\"fraudFlags\":0,\"watchFollowers\":5}")
echo "    user score=$(echo "$USER_REP" | jq -r '.score') tier=$(echo "$USER_REP" | jq -r '.tier')"

CREATOR_REP=$(curl -s -X POST "$GATEWAY/api/reputation/creators/recompute" \
  -H 'content-type: application/json' \
  -d "{\"creatorId\":\"$CREATOR_ID\",\"authenticatedAssetCount\":3,\"resaleVelocity\":2,\"campaignConversionRate\":0.12,\"referralConversionRate\":0.08}")
echo "    creator momentum=$(echo "$CREATOR_REP" | jq -r '.momentum')"

echo "==> 9. Open a dispute on the settlement"
DISPUTE=$(curl -s -X POST "$GATEWAY/api/disputes" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -d "{\"settlementId\":\"$SETTLEMENT_ID\",\"disputeType\":\"item_not_as_described\",\"reason\":\"jersey looked different in photos\"}")
DISPUTE_ID=$(echo "$DISPUTE" | jq -r '.id')
echo "    dispute.id = $DISPUTE_ID, status=$(echo "$DISPUTE" | jq -r '.status')"

sleep 1

echo "==> 10. Verify settlement now on_hold"
SETTLEMENT_NOW=$(curl -s "$GATEWAY/api/settlements/$SETTLEMENT_ID")
echo "    settlementState = $(echo "$SETTLEMENT_NOW" | jq -r '.settlementState')"
echo "    holdReason      = $(echo "$SETTLEMENT_NOW" | jq -r '.holdReason')"

echo "==> 11. Add a dispute message"
curl -s -X POST "$GATEWAY/api/disputes/$DISPUTE_ID/messages" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -d '{"body":"Adding evidence photos"}' >/dev/null

echo "==> 12. Admin resolves dispute (release)"
curl -s -X POST "$GATEWAY/api/disputes/$DISPUTE_ID/resolve" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"resolutionType":"release"}' >/dev/null

sleep 1

echo "==> 13. Tick settlement-transition worker"
TICK=$(curl -s -X POST "${SETTLEMENT_SERVICE_URL:-http://localhost:4015}/workers/settlement-transition/tick")
echo "    scheduled=$(echo "$TICK" | jq -r '.scheduled') completed=$(echo "$TICK" | jq -r '.completed')"

# Tick a second time so payout_scheduled → completed
TICK2=$(curl -s -X POST "${SETTLEMENT_SERVICE_URL:-http://localhost:4015}/workers/settlement-transition/tick")
echo "    second tick: completed=$(echo "$TICK2" | jq -r '.completed')"

SETTLEMENT_FINAL=$(curl -s "$GATEWAY/api/settlements/$SETTLEMENT_ID")
echo "    final state = $(echo "$SETTLEMENT_FINAL" | jq -r '.settlementState')"

echo "==> 14. Create + launch a campaign"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
END_ISO=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +7d +"%Y-%m-%dT%H:%M:%SZ")

CAMPAIGN=$(curl -s -X POST "$GATEWAY/api/campaigns" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"campaignType\":\"countdown_drop\",
    \"title\":\"Wave4 Drop\",
    \"description\":\"New collectible drop\",
    \"startsAt\":\"$NOW_ISO\",
    \"endsAt\":\"$END_ISO\",
    \"audienceType\":\"asset_watchers\",
    \"rewardType\":\"early_access\",
    \"assetId\":\"$ASSET_ID\"
  }")
CAMPAIGN_ID=$(echo "$CAMPAIGN" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/campaigns/$CAMPAIGN_ID/launch" \
  -H "authorization: Bearer $CREATOR_TOKEN" >/dev/null
echo "    campaign launched: $CAMPAIGN_ID"

# Track events
curl -s -X POST "$GATEWAY/api/campaigns/$CAMPAIGN_ID/events" \
  -H 'content-type: application/json' \
  -d '{"eventType":"click","payload":{"source":"vault"}}' >/dev/null
curl -s -X POST "$GATEWAY/api/campaigns/$CAMPAIGN_ID/events" \
  -H 'content-type: application/json' \
  -d '{"eventType":"convert","payload":{"orderId":"sample"}}' >/dev/null

CAMPAIGN_METRICS=$(curl -s "$GATEWAY/api/campaigns/$CAMPAIGN_ID/metrics")
echo "    clicks=$(echo "$CAMPAIGN_METRICS" | jq -r '.clicks') conversions=$(echo "$CAMPAIGN_METRICS" | jq -r '.conversions')"

echo "==> 15. Tick render worker"
RENDER_TICK=$(curl -s -X POST "$GATEWAY/api/render/workers/tick")
echo "    completed=$(echo "$RENDER_TICK" | jq -r '.completed') failed=$(echo "$RENDER_TICK" | jq -r '.failed')"

RENDER_JOBS=$(curl -s "$GATEWAY/api/render/jobs/by-asset/$ASSET_ID")
echo "    render jobs for this asset = $(echo "$RENDER_JOBS" | jq 'length')"

echo "==> 16. Trigger an automation event manually"
AUTO=$(curl -s -X POST "$GATEWAY/api/automation/events" \
  -H 'content-type: application/json' \
  -d "{\"eventType\":\"campaign.launched\",\"payload\":{\"recipientIds\":[\"$BUYER_USER_ID\"],\"title\":\"New drop\",\"body\":\"Check the new collectible\"}}")
echo "    rules matched=$(echo "$AUTO" | jq -r '.rulesMatched') sent=$(echo "$AUTO" | jq -r '.notificationsSent')"

echo "==> 17. Warehouse metrics"
METRICS=$(curl -s "$GATEWAY/api/warehouse/metrics")
echo "    GMV                  = \$$(echo "$METRICS" | jq -r '.market.gmv')"
echo "    sales                = $(echo "$METRICS" | jq -r '.market.sales')"
echo "    disputes opened      = $(echo "$METRICS" | jq -r '.trust.disputes')"
echo "    settlement hold rate = $(echo "$METRICS" | jq -r '.trust.settlementHoldRate')"
echo "    total facts          = $(echo "$METRICS" | jq -r '.totals.facts')"

echo "==> 18. Auction → bid → close worker"
END_ISO_NEAR=$(date -u +"%Y-%m-%dT%H:%M:%SZ")  # past
AUCTION=$(curl -s -X POST "$GATEWAY/api/auctions" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$CREATOR_USER_ID\",\"reservePrice\":1000,\"startingBid\":500,\"minIncrement\":100,\"startsAt\":\"$END_ISO_NEAR\",\"endsAt\":\"$END_ISO_NEAR\"}")
AUCTION_ID=$(echo "$AUCTION" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/auctions/$AUCTION_ID/bids" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $BUYER_TOKEN" \
  -d '{"amount":1500}' >/dev/null

# Wait a moment then close
sleep 1
CLOSE=$(curl -s -X POST "${AUCTION_SERVICE_URL:-http://localhost:4009}/workers/auction-close/tick")
echo "    closedSold=$(echo "$CLOSE" | jq -r '.closedSold') reserveNotMet=$(echo "$CLOSE" | jq -r '.closedReserveNotMet') noSale=$(echo "$CLOSE" | jq -r '.closedNoSale')"

echo "==> 19. Ops console proxy reads"
OPS_S=$(curl -s "$GATEWAY/api/ops/settlements" -H "authorization: Bearer $ADMIN_TOKEN")
OPS_D=$(curl -s "$GATEWAY/api/ops/disputes" -H "authorization: Bearer $ADMIN_TOKEN")
OPS_A=$(curl -s "$GATEWAY/api/fraud/alerts" -H "authorization: Bearer $ADMIN_TOKEN")
echo "    /api/ops/settlements = $(echo "$OPS_S" | jq 'length')"
echo "    /api/ops/disputes    = $(echo "$OPS_D" | jq 'length')"
echo "    /api/fraud/alerts    = $(echo "$OPS_A" | jq 'length')"

echo "==> 20. Public story aggregation (Wave 4)"
STORY=$(curl -s "$GATEWAY/api/public/story/$ASSET_SLUG")
echo "    settlementHealth   = $(echo "$STORY" | jq -r '.market.settlementHealth')"
echo "    rendered cards len = $(echo "$STORY" | jq -r '.renderedCards | length')"
echo "    campaigns len      = $(echo "$STORY" | jq -r '.campaigns | length')"
echo "    creator reputation = $(echo "$STORY" | jq -r '.creatorReputation')"

echo
echo "✅ Wave 4 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault"
echo "     http://localhost:3004/collectible/$ASSET_SLUG  — public story (with reputation + render + settlementHealth)"
echo "     http://localhost:3005  — market web"
echo "     http://localhost:3006  — ops console (NEW)"
