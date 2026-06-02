#!/usr/bin/env bash
# CrownX Jewel — Wave 2 end-to-end manual test script.
#
# Exercises the full Wave 2 trust-to-commerce-to-virality loop:
#
#   register creator (JWT)                   ──▶ JWT issued
#   register reviewer (JWT)                  ──▶ JWT issued
#   register fan (JWT)                       ──▶ JWT issued
#   create creator profile (bearer)
#   register asset (bearer, creator-only)
#   evidence upload intent + complete (bearer)
#   open auth case (bearer)
#   finalize (auth + asset approve + COA + notification fanout)
#   create royalty rule + listing
#   public story page (asset + COA + royalty)
#   fan creates referral code
#   fan reads /vault/me (empty until checkout)
#   fan reads /notifications/me
#
# Requires curl + jq. Boot the stack first:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave2-e2e-test.sh

set -euo pipefail

GATEWAY="${GATEWAY:-http://localhost:4000}"

reg() {
  curl -s -X POST "$GATEWAY/api/register" -H 'content-type: application/json' -d "$1"
}

echo "==> 1. Register creator (athlete)"
CREATOR_REG=$(reg '{"email":"e2e-athlete@example.com","displayName":"E2E Athlete","password":"AthletePass1!","role":"creator"}')
CREATOR_TOKEN=$(echo "$CREATOR_REG" | jq -r '.accessToken')
CREATOR_USER_ID=$(echo "$CREATOR_REG" | jq -r '.user.id')
echo "    user.id      = $CREATOR_USER_ID"
echo "    access token = ${CREATOR_TOKEN:0:32}..."

echo "==> 2. Register authenticator (reviewer)"
REVIEWER_REG=$(reg '{"email":"e2e-reviewer@example.com","displayName":"E2E Reviewer","password":"ReviewPass1!","role":"authenticator"}')
REVIEWER_TOKEN=$(echo "$REVIEWER_REG" | jq -r '.accessToken')
REVIEWER_USER_ID=$(echo "$REVIEWER_REG" | jq -r '.user.id')

echo "==> 3. Register fan"
FAN_REG=$(reg '{"email":"e2e-fan@example.com","displayName":"E2E Fan","password":"FanPass1234!","role":"fan"}')
FAN_TOKEN=$(echo "$FAN_REG" | jq -r '.accessToken')
FAN_USER_ID=$(echo "$FAN_REG" | jq -r '.user.id')

echo "==> 4. Create creator profile (with bearer)"
CREATOR_JSON=$(curl -s -X POST "$GATEWAY/api/creators" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"userId\":\"$CREATOR_USER_ID\",\"publicHandle\":\"@e2eathlete\",\"creatorType\":\"athlete\"}")
CREATOR_ID=$(echo "$CREATOR_JSON" | jq -r '.id')
echo "    creator.id = $CREATOR_ID"

echo "==> 5. Register asset (creator role required)"
ASSET_JSON=$(curl -s -X POST "$GATEWAY/api/assets" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"originatorId\":\"$CREATOR_ID\",
    \"currentOwnerId\":\"$CREATOR_USER_ID\",
    \"assetType\":\"memorabilia\",
    \"title\":\"E2E Signed Game Ball\",
    \"description\":\"World-series live signed ball\",
    \"editionType\":\"one_of_one\"
  }")
ASSET_ID=$(echo "$ASSET_JSON" | jq -r '.id')
ASSET_SLUG=$(echo "$ASSET_JSON" | jq -r '.slug')
echo "    asset.id   = $ASSET_ID"
echo "    asset.slug = $ASSET_SLUG"

echo "==> 6. Evidence upload intent (presigned URL)"
INTENT_JSON=$(curl -s -X POST "$GATEWAY/api/evidence/upload-intents" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"objectType\":\"video\",\"fileName\":\"signing.mp4\"}")
INTENT_ID=$(echo "$INTENT_JSON" | jq -r '.id')
PRESIGN=$(echo "$INTENT_JSON" | jq -r '.presignedUrl')
echo "    intent.id    = $INTENT_ID"
echo "    presignedUrl = $PRESIGN"

echo "==> 7. Evidence complete (asset moves draft -> pending)"
curl -s -X POST "$GATEWAY/api/evidence/complete" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"uploadIntentId\":\"$INTENT_ID\",
    \"objectType\":\"video\",
    \"storageUri\":\"s3://bucket/evidence/signing.mp4\",
    \"fileHash\":\"e2e-hash\",
    \"capturedAt\":\"2026-03-21T10:00:00Z\"
  }" >/dev/null

echo "==> 8. Open auth case"
CASE_JSON=$(curl -s -X POST "$GATEWAY/api/auth-cases" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"aiScore\":0.97}")
CASE_ID=$(echo "$CASE_JSON" | jq -r '.id')
echo "    case.id = $CASE_ID"

echo "==> 9. Finalize: approve + asset->public + COA + notify owner"
FINAL_JSON=$(curl -s -X POST "$GATEWAY/api/auth-cases/$CASE_ID/finalize" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $REVIEWER_TOKEN" \
  -d "{
    \"reviewerId\":\"$REVIEWER_USER_ID\",
    \"decisionReason\":\"Valid evidence\",
    \"assetId\":\"$ASSET_ID\",
    \"ownerId\":\"$CREATOR_USER_ID\"
  }")
COA_NUMBER=$(echo "$FINAL_JSON" | jq -r '.coa.coaNumber')
echo "    coa.coaNumber = $COA_NUMBER"

echo "==> 10. Royalty rule + listing"
curl -s -X POST "$GATEWAY/api/royalty-rules" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"beneficiaries\":[{\"beneficiaryId\":\"$CREATOR_ID\",\"percentage\":10}]}" >/dev/null

LISTING_JSON=$(curl -s -X POST "$GATEWAY/api/listings" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$CREATOR_USER_ID\",\"price\":100000}")
LISTING_ID=$(echo "$LISTING_JSON" | jq -r '.id')

echo "==> 11. Public story page (no auth required)"
STORY_JSON=$(curl -s "$GATEWAY/api/public/story/$ASSET_SLUG")
echo "    headline   = $(echo "$STORY_JSON" | jq -r '.story.headline')"
echo "    trustState = $(echo "$STORY_JSON" | jq -r '.story.trustState')"
echo "    royalty    = $(echo "$STORY_JSON" | jq -r '.royaltyEnabled')"

echo "==> 12. Fan creates referral code"
REF_JSON=$(curl -s -X POST "$GATEWAY/api/referrals" \
  -H "authorization: Bearer $FAN_TOKEN")
REF_CODE=$(echo "$REF_JSON" | jq -r '.referralCode')
INVITE_URL=$(echo "$REF_JSON" | jq -r '.inviteUrl')
echo "    referralCode = $REF_CODE"
echo "    inviteUrl    = $INVITE_URL"

echo "==> 13. Owner sees notification"
NOTIFS=$(curl -s "$GATEWAY/api/notifications/me" -H "authorization: Bearer $CREATOR_TOKEN")
NOTIF_COUNT=$(echo "$NOTIFS" | jq 'length')
echo "    notifications: $NOTIF_COUNT"
echo "    first:         $(echo "$NOTIFS" | jq -r '.[0].title // "(none)"')"

echo "==> 14. Owner sees own asset in vault"
VAULT=$(curl -s "$GATEWAY/api/vault/me" -H "authorization: Bearer $CREATOR_TOKEN")
VAULT_COUNT=$(echo "$VAULT" | jq 'length')
echo "    vault assets: $VAULT_COUNT"

echo "==> 15. Checkout (fan buys the listing)"
ORDER_JSON=$(curl -s -X POST "$GATEWAY/api/checkout" \
  -H 'content-type: application/json' \
  -d "{\"listingId\":\"$LISTING_ID\",\"buyerId\":\"$FAN_USER_ID\"}")
ORDER_ID=$(echo "$ORDER_JSON" | jq -r '.id')
NET=$(echo "$ORDER_JSON" | jq -r '.netToSeller')
echo "    order.id    = $ORDER_ID"
echo "    netToSeller = $NET"

echo
echo "✅ Wave 2 e2e flow complete."
echo "   Visit:"
echo "     http://localhost:3001  — creator portal"
echo "     http://localhost:3002  — admin queue"
echo "     http://localhost:3003  — collector vault (login as e2e-fan@example.com / FanPass1234!)"
echo "     http://localhost:3004/collectible/$ASSET_SLUG  — public story page"
