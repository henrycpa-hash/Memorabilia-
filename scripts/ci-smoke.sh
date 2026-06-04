#!/usr/bin/env bash
# CI helper: boot the CrownX core engines + gateway, run the smoke + security
# suites, then tear down. Exits non-zero if any suite fails.
set -uo pipefail
cd "$(dirname "$0")/.."

# generous rate limit so the full suite never self-throttles in CI
export RATE_LIMIT_MAX=100000
export JWT_SECRET="ci-test-secret-not-for-production"

CORE=(xp-service attribution-service passkey-service athlete-index-service \
  pack-n-ship-service authentication-engine-service network-feed-service \
  royalty-vault-service coa-artifact-service ai-modeling-service terms-service api-gateway)

pids=()
echo "Starting ${#CORE[@]} engines…"
for s in "${CORE[@]}"; do
  pnpm --filter "$s" dev >"/tmp/${s}.log" 2>&1 &
  pids+=($!)
done

cleanup() { for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT

# wait for the gateway aggregate health to report ok
echo "Waiting for services to become healthy…"
ok=0
for i in $(seq 1 60); do
  sleep 3
  if curl -sf -m4 http://localhost:4000/api/health 2>/dev/null | grep -q '"ok":true'; then ok=1; break; fi
done
if [ "$ok" != "1" ]; then
  echo "::error::services did not become healthy"
  curl -s -m4 http://localhost:4000/api/health || true
  echo "--- gateway log ---"; tail -40 /tmp/api-gateway.log 2>/dev/null || true
  exit 1
fi
echo "All services healthy."

# best-effort demo seed (auth + assets + holdings)
node scripts/seed-demo-users.mjs || true

fail=0
for smoke in security hardening terms ai-modeling royalty-vault coa-artifact appraiser-network feed auth round6 round7; do
  f="scripts/smoke-${smoke}.mjs"
  [ -f "$f" ] || continue
  echo "::group::smoke: ${smoke}"
  if node "$f"; then echo "PASS ${smoke}"; else echo "::error::FAIL ${smoke}"; fail=1; fi
  echo "::endgroup::"
done

exit $fail
