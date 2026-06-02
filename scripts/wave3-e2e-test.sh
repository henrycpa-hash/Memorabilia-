#!/usr/bin/env bash
# CrownX Jewel — Wave 3 end-to-end manual test script.
#
# Exercises the Wave 3 secondary-market + financial-traceability + virality loop:
#
#   register creator + reviewer + bidder + offerer  (JWT)
#   create asset, finalize, publish listing
#   create auction, place a bid                     (auction-service)
#   submit offer, counteroffer, accept              (offer-service)
#   add asset to fan watchlist                      (watchlist-service)
#   public story page (now includes ranking + timeline + market section + share cards)
#   checkout listing                                (gateway fans out to ledger + payouts + share-card + ranking + audit)
#   verify 4-leg ledger entries                     (ledger-payout-service)
#   verify payout items                             (ledger-payout-service)
#   verify trending score                           (growth-ranking-service)
#   verify share card                               (growth-ranking-service)
#   verify audit trail                              (audit-service)
#   verify ownership timeline                       (asset-registry-service)
#
# Requires curl + jq. Boot the stack first:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave3-e2e-test.sh

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

echo "==> 1. Register creator (athlete)"
CREATOR=$(regOrLogin '{"email":"w3-creator@example.com","displayName":"Wave3 Creator","password":"CreatorPass1!","role":"creator"}')
CREATOR_TOKEN=$(echo "$CREATOR" | jq -r '.accessToken')
CREATOR_USER_ID=$(echo "$CREATOR" | jq -r '.user.id')

echo "==> 2. Register reviewer (authenticator)"
REVIEWER=$(regOrLogin '{"email":"w3-reviewer@example.com","displayName":"Wave3 Reviewer","password":"ReviewPass1!","role":"authenticator"}')
REVIEWER_TOKEN=$(echo "$REVIEWER" | jq -r '.accessToken')
REVIEWER_USER_ID=$(echo "$REVIEWER" | jq -r '.user.id')

echo "==> 3. Register bidder (fan)"
BIDDER=$(regOrLogin '{"email":"w3-bidder@example.com","displayName":"Wave3 Bidder","password":"BidderPass1!","role":"fan"}')
BIDDER_TOKEN=$(echo "$BIDDER" | jq -r '.accessToken')
BIDDER_USER_ID=$(echo "$BIDDER" | jq -r '.user.id')

echo "==> 4. Register offerer (fan)"
OFFERER=$(regOrLogin '{"email":"w3-offerer@example.com","displayName":"Wave3 Offerer","password":"OffererPass1!","role":"fan"}')
OFFERER_TOKEN=$(echo "$OFFERER" | jq -r '.accessToken')
OFFERER_USER_ID=$(echo "$OFFERER" | jq -r '.user.id')

echo "==> 5. Creator profile"
CREATOR_PROFILE=$(curl -s -X POST "$GATEWAY/api/creators" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"userId\":\"$CREATOR_USER_ID\",\"publicHandle\":\"@w3athlete\",\"creatorType\":\"athlete\"}")
CREATOR_ID=$(echo "$CREATOR_PROFILE" | jq -r '.id')

echo "==> 6. Register asset"
ASSET=$(curl -s -X POST "$GATEWAY/api/assets" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"originatorId\":\"$CREATOR_ID\",
    \"currentOwnerId\":\"$CREATOR_USER_ID\",
    \"assetType\":\"memorabilia\",
    \"title\":\"Wave3 Championship Bat\",
    \"description\":\"Game-used championship-clinching bat\",
    \"editionType\":\"one_of_one\"
  }")
ASSET_ID=$(echo "$ASSET" | jq -r '.id')
ASSET_SLUG=$(echo "$ASSET" | jq -r '.slug')

echo "==> 7. Evidence intent + complete"
INTENT=$(curl -s -X POST "$GATEWAY/api/evidence/upload-intents" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"objectType\":\"video\",\"fileName\":\"signing.mp4\"}")
INTENT_ID=$(echo "$INTENT" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/evidence/complete" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"uploadIntentId\":\"$INTENT_ID\",
    \"objectType\":\"video\",
    \"storageUri\":\"s3://bucket/evidence/signing.mp4\",
    \"fileHash\":\"w3-hash\",
    \"capturedAt\":\"2026-04-01T10:00:00Z\"
  }" >/dev/null

echo "==> 8. Open + finalize auth case"
CASE=$(curl -s -X POST "$GATEWAY/api/auth-cases" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"aiScore\":0.97}")
CASE_ID=$(echo "$CASE" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/auth-cases/$CASE_ID/finalize" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $REVIEWER_TOKEN" \
  -d "{
    \"reviewerId\":\"$REVIEWER_USER_ID\",
    \"decisionReason\":\"Verified evidence\",
    \"assetId\":\"$ASSET_ID\",
    \"ownerId\":\"$CREATOR_USER_ID\"
  }" >/dev/null

echo "==> 9. Royalty rule + listing"
curl -s -X POST "$GATEWAY/api/royalty-rules" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"beneficiaries\":[{\"beneficiaryId\":\"$CREATOR_ID\",\"percentage\":10}]}" >/dev/null

LISTING=$(curl -s -X POST "$GATEWAY/api/listings" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$CREATOR_USER_ID\",\"price\":100000}")
LISTING_ID=$(echo "$LISTING" | jq -r '.id')
echo "    listing.id = $LISTING_ID"

echo "==> 10. Create auction"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
END_ISO=$(date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +1d +"%Y-%m-%dT%H:%M:%SZ")

AUCTION=$(curl -s -X POST "$GATEWAY/api/auctions" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"sellerId\":\"$CREATOR_USER_ID\",
    \"reservePrice\":50000,
    \"startingBid\":1000,
    \"minIncrement\":500,
    \"startsAt\":\"$NOW_ISO\",
    \"endsAt\":\"$END_ISO\"
  }")
AUCTION_ID=$(echo "$AUCTION" | jq -r '.id')
echo "    auction.id = $AUCTION_ID"

echo "==> 11. Place bid"
BID=$(curl -s -X POST "$GATEWAY/api/auctions/$AUCTION_ID/bids" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $BIDDER_TOKEN" \
  -d '{"amount":2000}')
echo "    bid.amount = $(echo "$BID" | jq -r '.amount')"

echo "==> 12. Offerer adds to watchlist"
curl -s -X POST "$GATEWAY/api/watchlists" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $OFFERER_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\"}" >/dev/null

echo "==> 13. Submit offer (offerer -> creator)"
OFFER=$(curl -s -X POST "$GATEWAY/api/offers" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $OFFERER_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"listingId\":\"$LISTING_ID\",
    \"sellerId\":\"$CREATOR_USER_ID\",
    \"amount\":80000
  }")
OFFER_ID=$(echo "$OFFER" | jq -r '.id')

echo "==> 14. Seller counteroffers"
COUNTERED=$(curl -s -X POST "$GATEWAY/api/offers/$OFFER_ID/counter" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d '{"amount":90000}')
echo "    counter status = $(echo "$COUNTERED" | jq -r '.status')"

echo "==> 15. Buyer accepts counteroffer"
ACCEPTED=$(curl -s -X POST "$GATEWAY/api/offers/$OFFER_ID/accept" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $OFFERER_TOKEN")
echo "    offer status = $(echo "$ACCEPTED" | jq -r '.status')"

echo "==> 16. Public story page (Wave 3 aggregation)"
STORY=$(curl -s "$GATEWAY/api/public/story/$ASSET_SLUG")
echo "    headline       = $(echo "$STORY" | jq -r '.story.headline')"
echo "    royaltyEnabled = $(echo "$STORY" | jq -r '.royaltyEnabled')"
echo "    timeline len   = $(echo "$STORY" | jq -r '.timeline | length')"
echo "    watchers       = $(echo "$STORY" | jq -r '.market.watchlistCount')"
echo "    accepted offers= $(echo "$STORY" | jq -r '.market.acceptedOfferCount')"

echo "==> 17. Checkout (buys at $100k -> ledger fanout)"
ORDER=$(curl -s -X POST "$GATEWAY/api/checkout" \
  -H 'content-type: application/json' \
  -d "{\"listingId\":\"$LISTING_ID\",\"buyerId\":\"$OFFERER_USER_ID\"}")
ORDER_ID=$(echo "$ORDER" | jq -r '.id')
echo "    order.id    = $ORDER_ID"
echo "    grossAmount = $(echo "$ORDER" | jq -r '.grossAmount')"

# Give the gateway a moment to finish fan-out (it's async).
sleep 1

echo "==> 18. 4-leg ledger entries for the order"
LEDGER=$(curl -s "$GATEWAY/api/ledger/entries/by-reference/order/$ORDER_ID")
echo "    legs posted = $(echo "$LEDGER" | jq 'length')"
echo "$LEDGER" | jq -r '.[] | "      " + .accountId + ": " + .direction + " " + .amount'

echo "==> 19. Payouts"
ALL_PAYOUTS=$(curl -s "$GATEWAY/api/payouts" -H "authorization: Bearer $CREATOR_TOKEN" || echo "[]")
echo "    payout items so far = $(echo "$ALL_PAYOUTS" | jq 'length // 0')"

echo "==> 20. Ranking"
RANK=$(curl -s "$GATEWAY/api/trending/assets/$ASSET_ID")
echo "    trendingScore = $(echo "$RANK" | jq -r '.trendingScore // "n/a"')"
echo "    saleCount     = $(echo "$RANK" | jq -r '.saleCount // 0')"
echo "    bidCount      = $(echo "$RANK" | jq -r '.bidCount // 0')"
echo "    watchlistCount= $(echo "$RANK" | jq -r '.watchlistCount // 0')"

echo "==> 21. Share cards"
CARDS=$(curl -s "$GATEWAY/api/share-cards/$ASSET_ID")
echo "    cards generated = $(echo "$CARDS" | jq 'length')"
echo "$CARDS" | jq -r '.[] | "      - " + .cardType + ": " + .title'

echo "==> 22. Audit trail for the order"
AUDIT=$(curl -s "$GATEWAY/api/audit/by-aggregate/order/$ORDER_ID")
echo "    audit entries for order = $(echo "$AUDIT" | jq 'length')"
echo "$AUDIT" | jq -r '.[] | "      - " + .actionType + " by " + .actorRole'

echo "==> 23. Ownership timeline"
TIMELINE=$(curl -s "$GATEWAY/api/assets/$ASSET_ID")
# We expose timeline via /assets/:id/timeline. The asset-registry shapes it as an array.
TIMELINE=$(curl -s "$GATEWAY/api/assets/$ASSET_ID/timeline" 2>/dev/null || echo "[]")
echo "    timeline events = $(echo "$TIMELINE" | jq 'length // 0')"
echo "$TIMELINE" | jq -r '.[]? | "      - " + .type + ": " + .label'

echo
echo "✅ Wave 3 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault"
echo "     http://localhost:3004/collectible/$ASSET_SLUG  — public story (now with ranking + timeline + market section)"
echo "     http://localhost:3005  — market web (listings, auctions, watchlist)"
