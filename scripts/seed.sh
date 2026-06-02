#!/usr/bin/env bash
# CrownX Jewel — Wave 2 seed script.
#
# Drops in:
#   - admin user (admin@crownx.local)
#   - authenticator user (reviewer@crownx.local)
#   - sample athlete creator (athlete@example.com)
#   - sample collector / fan user (fan@example.com)
#   - sample asset registered against the athlete
#   - one piece of evidence
#   - an authentication case + finalize -> COA + ownership notification
#   - sample royalty rule (10% to athlete)
#   - sample listing
#   - sample referral code from the fan
#
# Requires curl + jq. Boot the stack first:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/seed.sh

set -euo pipefail

GATEWAY="${GATEWAY:-http://localhost:4000}"

reg() {
  curl -s -X POST "$GATEWAY/api/register" \
    -H 'content-type: application/json' \
    -d "$1"
}

login() {
  curl -s -X POST "$GATEWAY/api/login" \
    -H 'content-type: application/json' \
    -d "$1"
}

echo "==> seeding admin"
ADMIN_JSON=$(reg '{"email":"admin@crownx.local","displayName":"CrownX Admin","password":"AdminPass123!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN_JSON" | jq -r '.accessToken // empty')
if [ -z "$ADMIN_TOKEN" ]; then
  ADMIN_TOKEN=$(login '{"email":"admin@crownx.local","password":"AdminPass123!"}' | jq -r '.accessToken')
fi

echo "==> seeding authenticator"
REVIEWER_JSON=$(reg '{"email":"reviewer@crownx.local","displayName":"Reviewer","password":"ReviewPass123!","role":"authenticator"}')
REVIEWER_TOKEN=$(echo "$REVIEWER_JSON" | jq -r '.accessToken // empty')
REVIEWER_ID=$(echo "$REVIEWER_JSON" | jq -r '.user.id // empty')
if [ -z "$REVIEWER_TOKEN" ]; then
  R=$(login '{"email":"reviewer@crownx.local","password":"ReviewPass123!"}')
  REVIEWER_TOKEN=$(echo "$R" | jq -r '.accessToken')
  REVIEWER_ID=$(echo "$R" | jq -r '.user.id')
fi

echo "==> seeding athlete creator"
ATH_JSON=$(reg '{"email":"athlete@example.com","displayName":"Athlete One","password":"AthletePass1!","role":"creator"}')
ATH_TOKEN=$(echo "$ATH_JSON" | jq -r '.accessToken // empty')
ATH_ID=$(echo "$ATH_JSON" | jq -r '.user.id // empty')
if [ -z "$ATH_TOKEN" ]; then
  R=$(login '{"email":"athlete@example.com","password":"AthletePass1!"}')
  ATH_TOKEN=$(echo "$R" | jq -r '.accessToken')
  ATH_ID=$(echo "$R" | jq -r '.user.id')
fi

CREATOR_JSON=$(curl -s -X POST "$GATEWAY/api/creators" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{\"userId\":\"$ATH_ID\",\"publicHandle\":\"@athleteone\",\"creatorType\":\"athlete\"}")
CREATOR_ID=$(echo "$CREATOR_JSON" | jq -r '.id')

echo "==> seeding fan / collector"
FAN_JSON=$(reg '{"email":"fan@example.com","displayName":"Fan Buyer","password":"FanPass1234!","role":"fan"}')
FAN_TOKEN=$(echo "$FAN_JSON" | jq -r '.accessToken // empty')
FAN_ID=$(echo "$FAN_JSON" | jq -r '.user.id // empty')
if [ -z "$FAN_TOKEN" ]; then
  R=$(login '{"email":"fan@example.com","password":"FanPass1234!"}')
  FAN_TOKEN=$(echo "$R" | jq -r '.accessToken')
  FAN_ID=$(echo "$R" | jq -r '.user.id')
fi

echo "==> registering asset"
ASSET_JSON=$(curl -s -X POST "$GATEWAY/api/assets" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{
    \"originatorId\":\"$CREATOR_ID\",
    \"currentOwnerId\":\"$ATH_ID\",
    \"assetType\":\"memorabilia\",
    \"title\":\"Signed Game Ball\",
    \"description\":\"World-series live signed ball\",
    \"editionType\":\"one_of_one\"
  }")
ASSET_ID=$(echo "$ASSET_JSON" | jq -r '.id')
ASSET_SLUG=$(echo "$ASSET_JSON" | jq -r '.slug')

echo "==> creating evidence intent + complete"
INTENT_JSON=$(curl -s -X POST "$GATEWAY/api/evidence/upload-intents" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"objectType\":\"video\",\"fileName\":\"signing.mp4\"}")
INTENT_ID=$(echo "$INTENT_JSON" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/evidence/complete" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{
    \"assetId\":\"$ASSET_ID\",
    \"uploadIntentId\":\"$INTENT_ID\",
    \"objectType\":\"video\",
    \"storageUri\":\"s3://bucket/evidence/signing.mp4\",
    \"fileHash\":\"abc123\",
    \"capturedAt\":\"2026-03-21T10:00:00Z\"
  }" >/dev/null

echo "==> opening + finalizing auth case"
CASE_JSON=$(curl -s -X POST "$GATEWAY/api/auth-cases" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"aiScore\":0.97}")
CASE_ID=$(echo "$CASE_JSON" | jq -r '.id')

curl -s -X POST "$GATEWAY/api/auth-cases/$CASE_ID/finalize" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $REVIEWER_TOKEN" \
  -d "{
    \"reviewerId\":\"$REVIEWER_ID\",
    \"decisionReason\":\"Valid evidence\",
    \"assetId\":\"$ASSET_ID\",
    \"ownerId\":\"$ATH_ID\"
  }" >/dev/null

echo "==> royalty rule + listing"
curl -s -X POST "$GATEWAY/api/royalty-rules" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"beneficiaries\":[{\"beneficiaryId\":\"$CREATOR_ID\",\"percentage\":10}]}" >/dev/null

curl -s -X POST "$GATEWAY/api/listings" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ATH_TOKEN" \
  -d "{\"assetId\":\"$ASSET_ID\",\"sellerId\":\"$ATH_ID\",\"price\":100000}" >/dev/null

echo "==> fan referral code"
REF_JSON=$(curl -s -X POST "$GATEWAY/api/referrals" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $FAN_TOKEN")
REF_CODE=$(echo "$REF_JSON" | jq -r '.referralCode')

echo
echo "✅ Wave 2 seed complete."
echo "   Public story:    http://localhost:3004/collectible/$ASSET_SLUG"
echo "   Vault (fan):     http://localhost:3003/login (use fan@example.com / FanPass1234!)"
echo "   Admin queue:     http://localhost:3002/auth-cases"
echo "   Referral code:   $REF_CODE"
