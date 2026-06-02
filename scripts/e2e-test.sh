#!/usr/bin/env bash
# CrownX Jewel — Wave 2 end-to-end manual test script.
#
# Walks the full Wave 2 flow:
#   register fan → register creator → register reviewer
#   creator profile → asset → evidence-intent → evidence-complete
#   auth case → finalize (approve + COA + notify owner)
#   royalty rule → listing → checkout
#   referral code → vault → notifications
#
# Boot the stack first:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run from the repo root:
#   ./scripts/e2e-test.sh

set -euo pipefail

GATEWAY="${GATEWAY:-http://localhost:4000}"
TS=$(date +%s)

echo "==> 1. Register creator (with password + JWT)"
CREATOR_REG=$(curl -s -X POST "$GATEWAY/api/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"creator-$TS@example.com\",\"displayName\":\"Athlete One\",\"password\":\"correcthorse\",\"role\":\"creator\"}")
CREATOR_USER_ID=$(echo "$CREATOR_REG" | jq -r '.user.id')
CREATOR_TOKEN=$(echo "$CREATOR_REG" | jq -r '.token')
echo "    creatorUser.id = $CREATOR_USER_ID"

echo "==> 2. Register reviewer (authenticator)"
REV_REG=$(curl -s -X POST "$GATEWAY/api/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"reviewer-$TS@example.com\",\"displayName\":\"Reviewer One\",\"password\":\"correcthorse\",\"role\":\"authenticator\"}")
REV_TOKEN=$(echo "$REV_REG" | jq -r '.token')
REV_USER_ID=$(echo "$REV_REG" | jq -r '.user.id')
echo "    reviewer.id = $REV_USER_ID"

echo "==> 3. Register fan (buyer)"
FAN_REG=$(curl -s -X POST "$GATEWAY/api/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"fan-$TS@example.com\",\"displayName\":\"Fan One\",\"password\":\"correcthorse\",\"role\":\"fan\"}")
FAN_USER_ID=$(echo "$FAN_REG" | jq -r '.user.id')
FAN_TOKEN=$(echo "$FAN_REG" | jq -r '.token')
echo "    fan.id = $FAN_USER_ID"

echo "==> 4. Creator profile"
CREATOR_PROFILE=$(curl -s -X POST "$GATEWAY/api/creators" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"userId\":\"$CREATOR_USER_ID\",\"publicHandle\":\"@athleteone-$TS\",\"creatorType\":\"athlete\"}")
CREATOR_ID=$(echo "$CREATOR_PROFILE" | jq -r '.id')
echo "    creator.id = $CREATOR_ID"

echo "==> 5. Register asset (gets a public slug)"
ASSET=$(curl -s -X POST "$GATEWAY/api/assets" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"originatorId\":\"$CREATOR_ID\",
    \"currentOwnerId\":\"$CREATOR_USER_ID\",
    \"assetType\":\"memorabilia\",
    \"title\":\"Signed Game Ball\",
    \"description\":\"World-series live signed ball\",
    \"editionType\":\"one_of_one\"
  }")
ASSET_ID=$(echo "$ASSET" | jq -r '.id')
ASSET_SLUG=$(echo "$ASSET" | jq -r '.slug')
echo "    asset.id   = $ASSET_ID"
echo "    asset.slug = $ASSET_SLUG"

echo "==> 6. Evidence: request upload intent"
INTENT=$(curl -s -X POST "$GATEWAY/api/evidence/upload-intents" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"objectType\":\"video\",\"fileName\":\"signing.mp4\"}")
INTENT_ID=$(echo "$INTENT" | jq -r '.id')
PRESIGNED_URL=$(echo "$INTENT" | jq -r '.presignedUrl')
echo "    intent.id     = $INTENT_ID"
echo "    presignedUrl  = $PRESIGNED_URL"

echo "==> 7. Evidence: complete upload (records hash)"
curl -s -X POST "$GATEWAY/api/evidence/complete" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"uploadIntentId\":\"$INTENT_ID\",
    \"objectType\":\"video\",
    \"storageUri\":\"s3://crownx/evidence/$ASSET_ID/signing.mp4\",
    \"fileHash\":\"sha256:abc123hash$TS\",
    \"capturedAt\":\"2026-04-26T12:00:00Z\"
  }" >/dev/null
echo "    evidence recorded"

echo "==> 8. Open authentication case"
CASE_JSON=$(curl -s -X POST "$GATEWAY/api/auth-cases" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"aiScore\":0.96}")
CASE_ID=$(echo "$CASE_JSON" | jq -r '.id')
echo "    case.id = $CASE_ID"

echo "==> 9. Reviewer finalizes case → approve auth + asset + COA + notify owner"
FINAL_JSON=$(curl -s -X POST "$GATEWAY/api/auth-cases/$CASE_ID/finalize" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $REV_TOKEN" \
  -d "{
    \"reviewerId\":\"$REV_USER_ID\",
    \"decisionReason\":\"Evidence valid\",
    \"assetId\":\"$ASSET_ID\",
    \"ownerId\":\"$CREATOR_USER_ID\"
  }")
COA_NUMBER=$(echo "$FINAL_JSON" | jq -r '.coa.coaNumber')
echo "    coa.coaNumber = $COA_NUMBER"

echo "==> 10. Public story page composer (no auth)"
STORY=$(curl -s "$GATEWAY/api/public/story/$ASSET_SLUG")
echo "    story.headline    = $(echo "$STORY" | jq -r '.story.headline')"
echo "    story.trustState  = $(echo "$STORY" | jq -r '.story.trustState')"
echo "    royaltyEnabled    = $(echo "$STORY" | jq -r '.royaltyEnabled')"

echo "==> 11. Royalty rule (10% to creator)"
curl -s -X POST "$GATEWAY/api/royalty-rules" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"beneficiaries\":[
      {\"beneficiaryId\":\"$CREATOR_ID\",\"percentage\":10}
    ]
  }" >/dev/null
echo "    royalty rule created"

echo "==> 12. Listing (\$100,000)"
LISTING_JSON=$(curl -s -X POST "$GATEWAY/api/listings" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $CREATOR_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$CREATOR_USER_ID\",\"price\":100000}")
LISTING_ID=$(echo "$LISTING_JSON" | jq -r '.id')
echo "    listing.id = $LISTING_ID"

echo "==> 13. Fan checks out"
ORDER_JSON=$(curl -s -X POST "$GATEWAY/api/checkout" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $FAN_TOKEN" \
  -d "{\"listingId\":\"$LISTING_ID\",\"buyerId\":\"$FAN_USER_ID\"}")
GROSS=$(echo "$ORDER_JSON" | jq -r '.grossAmount')
ROYALTY=$(echo "$ORDER_JSON" | jq -r '.royaltyAmount')
NET=$(echo "$ORDER_JSON" | jq -r '.netToSeller')
echo "    grossAmount   = $GROSS"
echo "    royaltyAmount = $ROYALTY"
echo "    netToSeller   = $NET"

echo "==> 14. Fan creates a referral code"
REF_JSON=$(curl -s -X POST "$GATEWAY/api/referrals" \
  -H "authorization: Bearer $FAN_TOKEN")
REF_CODE=$(echo "$REF_JSON" | jq -r '.referralCode')
INVITE_URL=$(echo "$REF_JSON" | jq -r '.inviteUrl')
echo "    referralCode = $REF_CODE"
echo "    inviteUrl    = $INVITE_URL"

echo "==> 15. Fan reads their notifications + vault"
NOTIFS=$(curl -s "$GATEWAY/api/notifications/me" -H "authorization: Bearer $FAN_TOKEN")
echo "    notifications: $(echo "$NOTIFS" | jq 'length')"
VAULT=$(curl -s "$GATEWAY/api/vault/me" -H "authorization: Bearer $FAN_TOKEN")
echo "    vault items:   $(echo "$VAULT" | jq 'length')"

echo "==> 16. Creator reads their notifications (should include coa_issued)"
CRE_NOTIFS=$(curl -s "$GATEWAY/api/notifications/me" -H "authorization: Bearer $CREATOR_TOKEN")
echo "    creator notifications: $(echo "$CRE_NOTIFS" | jq 'length')"
echo "    first type: $(echo "$CRE_NOTIFS" | jq -r '.[0].type // "none"')"

echo
echo "✅ Wave 2 trust + commerce + community + viral loop complete."
echo
echo "   Portals:"
echo "     creator-portal:    http://localhost:3001"
echo "     admin-queue:       http://localhost:3002"
echo "     collector-vault:   http://localhost:3003"
echo "     public-story-web:  http://localhost:3004/collectible/$ASSET_SLUG"
