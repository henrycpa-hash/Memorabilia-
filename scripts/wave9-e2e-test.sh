#!/usr/bin/env bash
# CrownX Jewel — Wave 9 end-to-end manual test script.
#
# Exercises Wave 9 sovereign / tax / redlining / assurance / privacy-compute /
# regulatory / sales-diligence flows:
#   register admin → create tenant
#   sovereign assignment to EU class → export-control evaluation (allow + deny)
#     → promotion request that auto-blocks under sovereign approval
#   tax jurisdiction lookup (UK) → tax determination on B2C and B2B reverse-charge
#     → withholding compute on royalty payout
#   contract version v1 → version v2 → diff with severity-classified clause changes
#     → negotiation issue raised + resolved
#     → fallback clause lookup
#   assurance audit with synthetic expected/actual pairs producing 4-severity
#     variances (critical $1k+ down to low <$10) → pipeline summary
#   privacy-compute job with mixed cohort sizes → released with Laplace noise vs suppressed
#   regulatory filing for UK VAT Q1 → file → upcoming-deadlines snapshot
#   sales opportunity → diligence workspace opens with default 10-item checklist
#     → answer 8 items → submit → completeness % + remaining effort hours
#   second buyer opportunity → workspace → reuse-suggestions surface prior workspace
#
# Boot the stack:
#   docker compose -f infra/compose/docker-compose.yml up --build
#
# Then run:
#   ./scripts/wave9-e2e-test.sh

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
ADMIN=$(regOrLogin '{"email":"w9-admin@example.com","displayName":"Wave9 Admin","password":"Pass1234!","role":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.accessToken')

echo "==> 2. Create tenant"
TENANT=$(curl -s -X POST "$GATEWAY/api/tenants" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"slug":"globalcorp-eu","name":"GlobalCorp EU","branding":{"displayName":"GlobalCorp EU"}}')
TENANT_ID=$(echo "$TENANT" | jq -r '.id')
echo "    tenant.id           = $TENANT_ID"

echo "==> 3. Sovereign: assign EU sovereign class + export-control evaluations + promotion request"
EU_CLASS_ID=$(curl -s "$GATEWAY/api/sovereign/classes/by-key/sovereign_eu" | jq -r '.id')
COMM_CLASS_ID=$(curl -s "$GATEWAY/api/sovereign/classes/by-key/commercial_default" | jq -r '.id')
echo "    sovereign_eu.id     = $EU_CLASS_ID"

ASSIGN=$(curl -s -X POST "$GATEWAY/api/sovereign/assignments" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"sovereignClassId\":\"$EU_CLASS_ID\"}")
echo "    assignment status   = $(echo "$ASSIGN" | jq -r '.status')  classKey=$(echo "$ASSIGN" | jq -r '.classKey')"

curl -s -X POST "$GATEWAY/api/sovereign/export-controls" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"tenantId\":\"$TENANT_ID\",
    \"controlType\":\"data_export\",
    \"rules\":{
      \"blockAll\":false,
      \"allowedDestinations\":[\"eu_west\",\"eu_central\",\"uk\"],
      \"blockedDestinations\":[\"us_east\",\"us_west\"],
      \"reviewRequired\":false
    }
  }" >/dev/null

ALLOW=$(curl -s -X POST "$GATEWAY/api/sovereign/export-controls/evaluate" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"controlType\":\"data_export\",\"destinationRegion\":\"eu_central\"}")
echo "    export EU→EU        = $(echo "$ALLOW" | jq -r '.evaluation.decision')"

DENY=$(curl -s -X POST "$GATEWAY/api/sovereign/export-controls/evaluate" \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"$TENANT_ID\",\"controlType\":\"data_export\",\"destinationRegion\":\"us_east\"}")
echo "    export EU→US        = $(echo "$DENY" | jq -r '.evaluation.decision')  reason=$(echo "$DENY" | jq -r '.evaluation.reasons[0]')"

PROMO=$(curl -s -X POST "$GATEWAY/api/sovereign/promotions" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"fromEnvironment\":\"staging\",\"toEnvironment\":\"production\",\"rationale\":\"Q1 GA launch\"}")
echo "    promotion status    = $(echo "$PROMO" | jq -r '.status') (sovereign_eu requires manual approval)"

echo "==> 4. Tax: jurisdiction lookup + B2C and B2B reverse-charge determinations + withholding"
UK_JUR=$(curl -s "$GATEWAY/api/tax/jurisdictions/by-country/GB")
UK_ID=$(echo "$UK_JUR" | jq -r '.id')
echo "    UK jurisdiction.id  = $UK_ID"

B2C=$(curl -s -X POST "$GATEWAY/api/tax/determinations" \
  -H 'content-type: application/json' \
  -d "{\"jurisdictionId\":\"$UK_ID\",\"referenceType\":\"invoice_line\",\"referenceId\":\"inv_w9_b2c\",\"netAmountCents\":10000,\"isB2B\":false,\"buyerRegion\":\"GB\",\"sellerRegion\":\"GB\"}")
echo "    UK B2C £100 net     = tax=£$(echo "$B2C" | jq -r '.result.taxAmountCents | (./100)')  total=£$(echo "$B2C" | jq -r '.result.totalAmountCents | (./100)')  rule=$(echo "$B2C" | jq -r '.result.ruleKey')"

B2B=$(curl -s -X POST "$GATEWAY/api/tax/determinations" \
  -H 'content-type: application/json' \
  -d "{\"jurisdictionId\":\"$UK_ID\",\"referenceType\":\"invoice_line\",\"referenceId\":\"inv_w9_b2b\",\"netAmountCents\":50000,\"isB2B\":true,\"buyerRegion\":\"DE\",\"sellerRegion\":\"GB\"}")
echo "    UK→DE B2B £500 net  = tax=£$(echo "$B2B" | jq -r '.result.taxAmountCents | (./100)')  reverseCharge=$(echo "$B2B" | jq -r '.result.reverseCharge')"

WH=$(curl -s -X POST "$GATEWAY/api/tax/withholding/compute" \
  -H 'content-type: application/json' \
  -d '{"grossAmountCents":100000,"rateBps":3000}')
echo "    withholding 30% on \$1000  = withheld=\$$(echo "$WH" | jq -r '.withheldCents | (./100)')  net=\$$(echo "$WH" | jq -r '.netAmountCents | (./100)')"

echo "==> 5. Redlining: 2 versions + diff + issue + fallback clause"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EXP_ISO=$(date -u -d "+365 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +365d +"%Y-%m-%dT%H:%M:%SZ")
AGREEMENT=$(curl -s -X POST "$GATEWAY/api/contracts/agreements" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"agreementType\":\"institution_platform\",\"counterpartyType\":\"institution\",\"counterpartyName\":\"GlobalCorp Athletics\",\"effectiveDate\":\"$NOW_ISO\",\"expirationDate\":\"$EXP_ISO\",\"termsJson\":{}}")
AGREEMENT_ID=$(echo "$AGREEMENT" | jq -r '.id')

V1=$(curl -s -X POST "$GATEWAY/api/redlines/versions" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"agreementId\":\"$AGREEMENT_ID\",
    \"contentUri\":\"s3://crownx-redlines/v1.docx\",
    \"clauseBodies\":{
      \"indemnification\":\"Each party indemnifies up to fees paid in prior 12 months.\",
      \"liability_limit\":\"Aggregate liability limited to fees in prior 12 months.\",
      \"termination\":\"90 days notice for convenience.\",
      \"data_processing\":\"Standard DPA applies.\"
    }
  }")
V1_ID=$(echo "$V1" | jq -r '.id')

V2=$(curl -s -X POST "$GATEWAY/api/redlines/versions" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"agreementId\":\"$AGREEMENT_ID\",
    \"contentUri\":\"s3://crownx-redlines/v2.docx\",
    \"clauseBodies\":{
      \"indemnification\":\"Each party indemnifies up to 24 months of fees.\",
      \"liability_limit\":\"Aggregate liability limited to 2x fees in prior 12 months.\",
      \"termination\":\"30 days notice for convenience.\",
      \"data_processing\":\"Standard DPA applies.\",
      \"audit_rights\":\"Annual audit rights with 30 days notice.\"
    }
  }")
V2_ID=$(echo "$V2" | jq -r '.id')
echo "    v1.id=$V1_ID  v2.id=$V2_ID"

DIFF=$(curl -s -X POST "$GATEWAY/api/redlines/diffs" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"baseVersionId\":\"$V1_ID\",\"compareVersionId\":\"$V2_ID\"}")
echo "    diff summary        = added=$(echo "$DIFF" | jq -r '.summary.clausesAdded')  modified=$(echo "$DIFF" | jq -r '.summary.clausesModified')  removed=$(echo "$DIFF" | jq -r '.summary.clausesRemoved')"
echo "    high-severity       = $(echo "$DIFF" | jq -c '[.summary.changes[] | select(.severity=="high") | .clauseKey]')"

ISSUE=$(curl -s -X POST "$GATEWAY/api/redlines/issues" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"agreementId\":\"$AGREEMENT_ID\",\"issueType\":\"clause_change_requested\",\"clauseKey\":\"liability_limit\",\"description\":\"2x cap is too generous; counter-propose 1.5x\"}")
ISSUE_ID=$(echo "$ISSUE" | jq -r '.id')
echo "    issue.id            = $ISSUE_ID"

FB=$(curl -s "$GATEWAY/api/redlines/clauses/liability_limit_standard/fallback/0")
echo "    fallback rank 1     = requiresLegalReview=$(echo "$FB" | jq -r '.requiresLegalReview')"

echo "==> 6. Assurance: audit with synthetic variances spanning all severity bands"
AUDIT=$(curl -s -X POST "$GATEWAY/api/assurance/audits" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "auditType":"settlement_to_revshare",
    "scopeType":"platform",
    "expected":[
      {"referenceType":"settlement","referenceId":"set_1","expectedCents":100000,"actualCents":0},
      {"referenceType":"settlement","referenceId":"set_2","expectedCents":250000,"actualCents":0},
      {"referenceType":"settlement","referenceId":"set_3","expectedCents":50000,"actualCents":0},
      {"referenceType":"settlement","referenceId":"set_4","expectedCents":1500,"actualCents":0},
      {"referenceType":"settlement","referenceId":"set_missing","expectedCents":75000,"actualCents":0}
    ],
    "actual":[
      {"referenceType":"settlement","referenceId":"set_1","expectedCents":0,"actualCents":99300},
      {"referenceType":"settlement","referenceId":"set_2","expectedCents":0,"actualCents":250000},
      {"referenceType":"settlement","referenceId":"set_3","expectedCents":0,"actualCents":49995},
      {"referenceType":"settlement","referenceId":"set_4","expectedCents":0,"actualCents":1495},
      {"referenceType":"settlement","referenceId":"set_extra","expectedCents":0,"actualCents":2500}
    ]
  }')
AUDIT_ID=$(echo "$AUDIT" | jq -r '.id')
echo "    audit.id            = $AUDIT_ID"
echo "    summary             = totalVariances=$(echo "$AUDIT" | jq -r '.summary.totalVariances')  totalLeakage=\$$(echo "$AUDIT" | jq -r '.summary.totalLeakageCents | (./100)')"
echo "    by severity         = $(echo "$AUDIT" | jq -c '.summary.bySeverity')"

PIPELINE=$(curl -s "$GATEWAY/api/assurance/pipeline-summary")
echo "    pipeline summary    = $(echo "$PIPELINE" | jq -c '.bySeverity')  totalLeakage=\$$(echo "$PIPELINE" | jq -r '.totalLeakageCents | (./100)')"

echo "==> 7. Privacy-enhancing compute: noisy aggregates with mixed eligibility"
PCJ=$(curl -s -X POST "$GATEWAY/api/privacy-compute/jobs" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "jobType":"differential_release",
    "epsilon":1.0,
    "scopeType":"platform",
    "metricSets":[
      {"metricKey":"gmv_q1","cohortSize":150,"rawValue":24500000,"kAnonymity":12,"privacyClass":"tenant_scoped"},
      {"metricKey":"creator_count","cohortSize":3,"rawValue":3,"kAnonymity":2,"privacyClass":"tenant_scoped"},
      {"metricKey":"public_listings","cohortSize":2000,"rawValue":4500,"kAnonymity":150,"privacyClass":"public"}
    ]
  }')
JOB_ID=$(echo "$PCJ" | jq -r '.id')
echo "    job.id              = $JOB_ID  status=$(echo "$PCJ" | jq -r '.status')"
echo "    artifacts           = $(echo "$PCJ" | jq -c '[.artifacts[] | {metric: .metricKey, decision: .decision, value: .protectedValue, noise: .noiseAddedAbs}]')"

echo "==> 8. Regulatory: UK VAT Q1 filing"
UK_VAT_PROFILE_ID=$(curl -s "$GATEWAY/api/regulatory/profiles" | jq -r '.[] | select(.jurisdictionKey=="GB" and .filingType=="vat_return") | .id')
PERIOD_END=$(date -u -d "$(date -u +%Y)-03-31" +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -v3m -v31d +"%Y-%m-%dT00:00:00Z")

FILING=$(curl -s -X POST "$GATEWAY/api/regulatory/filings" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"profileId\":\"$UK_VAT_PROFILE_ID\",
    \"periodEnd\":\"$PERIOD_END\",
    \"data\":{
      \"sales_total\":1250000,
      \"purchases_total\":450000,
      \"vat_due\":250000,
      \"vat_reclaimed\":90000
    }
  }")
FILING_ID=$(echo "$FILING" | jq -r '.id')
echo "    filing.id           = $FILING_ID  periodKey=$(echo "$FILING" | jq -r '.periodKey')  status=$(echo "$FILING" | jq -r '.status')  deadline=$(echo "$FILING" | jq -r '.deadline')"

FILED=$(curl -s -X POST "$GATEWAY/api/regulatory/filings/$FILING_ID/file" -H "authorization: Bearer $ADMIN_TOKEN")
echo "    filed status        = $(echo "$FILED" | jq -r '.status')  artifacts=$(echo "$FILED" | jq -r '.bundle.artifacts | length')"

echo "==> 9. Sales/diligence: opportunity + workspace + 8 answered items + reuse on second buyer"
OPP1=$(curl -s -X POST "$GATEWAY/api/sales/opportunities" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"accountName":"AcmeBuyer","estimatedAcvCents":50000000}')
OPP1_ID=$(echo "$OPP1" | jq -r '.id')

WS1=$(curl -s -X POST "$GATEWAY/api/sales/diligence/workspaces" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"opportunityId\":\"$OPP1_ID\"}")
WS1_ID=$(echo "$WS1" | jq -r '.id')
echo "    workspace.id        = $WS1_ID  checklist=$(echo "$WS1" | jq -r '.checklist | length') items"

curl -s -X POST "$GATEWAY/api/sales/diligence/workspaces/$WS1_ID/start" -H "authorization: Bearer $ADMIN_TOKEN" >/dev/null

# Answer 8 of 10 items
for ITEM in soc2_report iso_certs sig_questionnaire data_processing_addendum subprocessor_list cyber_insurance audited_financials incident_response_plan; do
  curl -s -X PUT "$GATEWAY/api/sales/diligence/workspaces/$WS1_ID/items/$ITEM" \
    -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
    -d '{"status":"delivered","responseBody":"See attached evidence pack","evidenceRef":"audit:'$ITEM'_2026"}' >/dev/null
done

SUBMIT1=$(curl -s -X POST "$GATEWAY/api/sales/diligence/workspaces/$WS1_ID/submit" -H "authorization: Bearer $ADMIN_TOKEN")
echo "    submit completeness = $(echo "$SUBMIT1" | jq -r '.completeness.completenessPct')%  remainingHours=$(echo "$SUBMIT1" | jq -r '.remainingEffortHours')"

# Second buyer should get reuse suggestions
OPP2=$(curl -s -X POST "$GATEWAY/api/sales/opportunities" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d '{"accountName":"NextBuyerCo","estimatedAcvCents":75000000}')
OPP2_ID=$(echo "$OPP2" | jq -r '.id')
WS2=$(curl -s -X POST "$GATEWAY/api/sales/diligence/workspaces" \
  -H 'content-type: application/json' -H "authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"opportunityId\":\"$OPP2_ID\"}")
WS2_ID=$(echo "$WS2" | jq -r '.id')
REUSE=$(curl -s "$GATEWAY/api/sales/diligence/workspaces/$WS2_ID/reuse-suggestions")
echo "    reuse suggestions   = $(echo "$REUSE" | jq 'length') items reusable from prior workspace"

PSUMM=$(curl -s "$GATEWAY/api/sales/pipeline-summary")
echo "    pipeline by stage   = $(echo "$PSUMM" | jq -c 'with_entries(select(.value.count > 0))')"

echo "==> 10. Snapshot of new Wave 9 surfaces"
echo "    sovereign classes        = $(curl -s "$GATEWAY/api/sovereign/classes" | jq 'length')"
echo "    sovereign assignments    = $(curl -s "$GATEWAY/api/sovereign/assignments" | jq 'length')"
echo "    export evaluations       = $(curl -s "$GATEWAY/api/sovereign/export-controls/evaluations" | jq 'length')"
echo "    promotion requests       = $(curl -s "$GATEWAY/api/sovereign/promotions" | jq 'length')"
echo "    tax jurisdictions        = $(curl -s "$GATEWAY/api/tax/jurisdictions" | jq 'length')"
echo "    tax determinations       = $(curl -s "$GATEWAY/api/tax/determinations" | jq 'length')"
echo "    contract versions        = $(curl -s "$GATEWAY/api/redlines/versions" | jq 'length')"
echo "    redline diffs            = $(curl -s "$GATEWAY/api/redlines/diffs" | jq 'length')"
echo "    negotiation issues       = $(curl -s "$GATEWAY/api/redlines/issues" | jq 'length')"
echo "    clause library size      = $(curl -s "$GATEWAY/api/redlines/clauses" | jq 'length')"
echo "    assurance audits         = $(curl -s "$GATEWAY/api/assurance/audits" | jq 'length')"
echo "    assurance variances      = $(curl -s "$GATEWAY/api/assurance/variances" | jq 'length')"
echo "    privacy-compute jobs     = $(curl -s "$GATEWAY/api/privacy-compute/jobs" | jq 'length')"
echo "    regulatory profiles      = $(curl -s "$GATEWAY/api/regulatory/profiles" | jq 'length')"
echo "    regulatory filings       = $(curl -s "$GATEWAY/api/regulatory/filings" | jq 'length')"
echo "    upcoming deadlines       = $(curl -s "$GATEWAY/api/regulatory/upcoming-deadlines" | jq 'length')"
echo "    sales opportunities      = $(curl -s "$GATEWAY/api/sales/opportunities" | jq 'length')"
echo "    diligence workspaces     = $(curl -s "$GATEWAY/api/sales/diligence/workspaces" | jq 'length')"

echo
echo "✅ Wave 9 e2e flow complete."
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
echo "     http://localhost:3016  — collections operations"
echo "     http://localhost:3019  — sovereign control (NEW Wave 9)"
