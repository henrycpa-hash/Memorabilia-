# CrownX Jewel

**Authenticated memorabilia + NIL rights + trust commerce platform.**
Wave 7 release — enterprise-procurement ready, contract-aware, monetized
multi-tenant operating system with legal-grade governance, finance-system
interoperability, policy simulation, federated analytics, and service-level
governance.

```
+----------------------------------------------------------+
|                     CrownX Jewel v0.7                    |
|                                                          |
| Wave 7 -> enterprise procurement                         |
|   SSO + billing + ERP + contracts + legal packets        |
|   policy sandbox + federated analytics + SLA             |
|                                                          |
| Wave 6 -> ecosystem-grade institutional platform         |
| Wave 5 -> payments, shipping, insurance, ML risk, social |
| Wave 4 -> settlement, dispute, fraud, campaigns, ops     |
| Wave 3 -> auctions, offers, ledger, ranking, audit, web  |
| Wave 2 -> JWT, RBAC, vault, story, referrals, notifs     |
| Wave 1 -> trust-to-commerce nucleus                      |
+----------------------------------------------------------+
```

---

## Quick start

```bash
cp .env.example .env
docker compose -f infra/compose/docker-compose.yml up --build

# in another shell:
./scripts/wave7-e2e-test.sh        # exercises Wave 7 enterprise flow
```

Open ports:
- **3001** creator portal · **3002** admin queue · **3003** collector vault
- **3004** public story · **3005** market web · **3006** ops console
- **3007** institutional reporting · **3011** compliance control
- **3012** procurement governance (NEW Wave 7)
- **4000** API gateway

---

## Wave 7 highlights

### 8 new services on ports 4038-4045

| Port | Service                       | Purpose |
|------|-------------------------------|---------|
| 4038 | sso-federation-service        | IdPs, SCIM JIT provisioning, role mapping, session claims |
| 4039 | billing-metering-service      | Plans, subscriptions, usage events, statement closure with overage |
| 4040 | erp-gl-connector-service      | ERP profiles (NetSuite/QuickBooks/Xero/SAP/Oracle), exports, ack reconciliation |
| 4041 | contract-lifecycle-service    | Agreements, amendments, obligations, signature state, governing-agreement resolution |
| 4042 | legal-packet-service          | Procurement / dispute / claim / audit packet assembly from upstream services |
| 4043 | policy-sandbox-service        | What-if policy simulation with variants, simulate-by-type across packs |
| 4044 | federated-analytics-service   | Peer groups, benchmark runs with privacy threshold suppression |
| 4045 | sla-governance-service        | Profiles, observations, breach detection with severity, resolution |

### 6 new shared packages

`shared-sso` · `shared-billing` · `shared-contracts` · `shared-legal` · `shared-sandbox` · `shared-sla`

### 1 new portal

**procurement-governance-portal (3012)** — readiness checklist, SSO providers, active agreements, recent legal packets, open SLA breaches, recent statements with totals + overage.

---

## Enterprise procurement flow (Wave 7)

```
sign commercial agreement (contract-lifecycle-service)
        v
create tenant (tenancy-service)
        v
configure IdP + role mappings + SCIM sync (sso-federation-service)
        v
assign plan + start subscription (billing-metering-service)
        v
attach policy pack (policy-compliance-service)
        v
attach SLA profile (sla-governance-service)
        v
generate procurement legal packet (legal-packet-service)
        v
ENTERPRISE TENANT LIVE WITH FULL GOVERNANCE
```

---

## SSO / SCIM flow

```
1. POST /sso/providers                    -> IdP record per tenant (saml/oidc/okta/azure_ad/...)
2. POST /sso/providers/:id/role-mappings  -> external group -> internal role
3. POST /sso/providers/:id/scim/sync      -> JIT provisions/updates/deactivates users
4. GET  /sso/resolve-domain?email=...     -> routes login by email domain
5. POST /sso/providers/:id/sessions/build -> resolves internal roles from claims
```

Wave 7 ships a deterministic SCIM simulator and session-claims builder.
Wave 8 wires real SAML/OIDC libraries and a JWT mint at the gateway.

---

## Billing state machine

```
billing_plan -+
              +-> tenant_subscription [trialing -> active -> past_due -> canceled/expired]
usage_event --+                                          |
                                                         v
                                             billing_statement
                                             [open -> issued -> paid/overdue/void]
```

`computeStatementAmountCents()` is deterministic: included units come from the
plan's entitlements, anything above included is multiplied by
`unitPriceCentsPerUnit` and added to the base fee.

The service seeds three plans on boot — `starter`, `growth`, `enterprise` —
so the e2e test runs without manual setup.

---

## Contract state machine

| Status         | Means                                                                  |
|----------------|------------------------------------------------------------------------|
| `draft`        | Created, terms not finalized                                           |
| `under_review` | Sent for legal/business review                                         |
| `approved`     | Counterparty terms accepted, awaiting effective date                   |
| `active`       | In force — eligible for `resolveGoverning` matches                     |
| `expiring`     | Within 30 days of expiration — renewal review obligations should fire  |
| `expired`      | Past expiration — read-only                                            |
| `terminated`   | Ended early                                                            |

`POST /contracts/rollup` runs `nextAgreementStatus` against every record to
flip approved->active and active->expiring/expired by time.

**Signature state** (`unsigned` -> `pending_counterparty`/`pending_us` ->
`fully_signed`) tracks separately from agreement status.
`POST /contracts/agreements/:id/sign` flips both.

---

## Legal packet types

| Type                       | Default sections (in order) |
|----------------------------|-----------------------------|
| `procurement_packet`       | cover · summary · timeline · evidence_manifest · audit_summary · policy_evaluation · contract_extract · appendix |
| `dispute_packet`           | cover · summary · timeline · evidence_manifest · audit_summary · policy_evaluation · settlement_summary · appendix |
| `claims_packet`            | cover · summary · timeline · evidence_manifest · audit_summary · policy_evaluation · shipment_summary · settlement_summary · appendix |
| `compliance_packet`        | cover · summary · timeline · evidence_manifest · audit_summary · policy_evaluation · appendix |
| `audit_packet`             | cover · summary · timeline · evidence_manifest · audit_summary · policy_evaluation · appendix |
| `partner_incident_packet`  | cover · summary · timeline · evidence_manifest · audit_summary · policy_evaluation · appendix |

`/legal-packets/:id/assemble` pulls payloads from audit-service, asset-service
(timeline + evidence), shipping, settlement, policy-compliance, and
contract-lifecycle as relevant for the packet type.

---

## Policy sandbox flow

```
user submits subject + variants
        v
fetch policy pack from policy-compliance-service
        v
evaluate base subject + each variant LOCALLY
   (sandbox runs do NOT persist as live evaluations)
        v
explainVariance() compares base verdict to each variant
        v
return { baseResult, variantResults, varianceExplanation }
```

`simulate-by-type` runs the same subject across every active pack of a
policy type and returns a worst-case verdict
(reject > review > approve_with_conditions > approve).

---

## Federated analytics privacy threshold

```
peer_group { memberIds: [...] }
        v
runBenchmark() walks each member x each metricKey
        v
for each metric: if sample size < PRIVACY_MIN_MEMBERS (default 3):
    -> metric goes into resultJson.privacy.suppressed
    -> no peerStats entry emitted
otherwise:
    -> emit p25 / p50 / p75 / mean / sampleSize for that metric
```

Wave 7 default minimum is **3 members per metric**; Wave 8 will add
k-anonymity, differential privacy noise, and per-metric privacy budgets.

---

## SLA target keys & severity rules

| Target key                        | Comparison        | Notes                     |
|-----------------------------------|-------------------|---------------------------|
| `api_uptime_pct`                  | observed < target | percent uptime            |
| `partner_sync_freshness_minutes`  | observed > target | freshness in minutes      |
| `settlement_completion_hours`     | observed > target | settlement-to-paid window |
| `dispute_response_hours`          | observed > target | first-response SLA        |
| `connector_recovery_minutes`      | observed > target | partner connector outage  |
| `report_generation_minutes`       | observed > target | report SLA                |

**Severity** is derived from the breach delta as a ratio of the target:
- `delta / target >= 0.50` -> `critical`
- `delta / target >= 0.15` -> `warning`
- otherwise               -> `info`

---

## Wave 7 RBAC additions

- `admin` — manages SSO providers, billing plans/subscriptions, ERP profiles, agreements, SLA profiles
- `finance` — closes statements (plan check via SSO role mapping)
- existing roles unchanged

---

## API surface (gateway)

Wave 7 routes added to the gateway at port 4000:

```
/api/sso/*                       -> sso-federation-service
/api/billing/*                   -> billing-metering-service
/api/erp/*                       -> erp-gl-connector-service
/api/contracts/*                 -> contract-lifecycle-service
/api/legal-packets/*             -> legal-packet-service
/api/policy-sandbox/*            -> policy-sandbox-service
/api/federated-analytics/*       -> federated-analytics-service
/api/sla/*                       -> sla-governance-service
```

All Wave 1-6 routes remain at their original paths.

---

## Known gaps after Wave 7 (queued for Wave 8)

- Enterprise billing **collections & dunning** workflows
- Contract **signature workflow integrations** (DocuSign / Adobe Sign / Conga)
- Dynamic **revenue-share hierarchies** across tenant + partner trees
- **Privacy-preserving federated analytics** (DP, k-anon, federated training)
- **Service credit automation** based on SLA breach severity
- **Multi-region data residency** + sovereign policy routing
- **External legal-system connectors** (e-discovery / matter management)
- **Procurement questionnaire automation** (SIG / CAIQ / SOC 2 evidence)

---

## Repository structure

```
crownx-jewel/
|-- apps/                      9 Next.js portals (Wave 7 adds procurement-governance-portal)
|-- services/                  46 services (gateway + 45 domain services Wave 1-7)
|-- packages/                  32 shared workspace packages
|-- infra/
|   |-- compose/               docker-compose.yml — full stack
|   |-- docker/                gateway/service/portal Dockerfiles
|   `-- migrations/            45 schema migrations + all.sql chain
`-- scripts/                   wave1 -> wave7 e2e flows
```

---

## Versioning

Wave 7 ships at **v0.7.0**.
Wave 6 zip and earlier wave artifacts remain side-by-side in
`/mnt/user-data/outputs/` for reference.

---

# Wave 8 — Globally Enterprise-Ready

Wave 8 turns Wave 7 (enterprise-procurement-ready) into a **globally deployable
enterprise revenue / legal-execution / partner-economics / privacy-governed
analytics / multinational-governance platform**.

## Wave 8 services (4046–4052)

| Port | Service | Responsibility |
|------|---------|----------------|
| 4046 | `collections-dunning-service` | Receivables, aging buckets, 5-step dunning cadence, promise-to-pay, write-offs |
| 4047 | `signature-integration-service` | E-signature envelopes, signer routing, callback ingestion, contract auto-advance |
| 4048 | `revenue-share-service` | Trees with platform/tenant/partner scope, waterfall calculation, partner statements |
| 4049 | `privacy-governance-service` | Release policies, cohort + k-anon thresholds, blacklist/whitelist, severity-ranked decisions |
| 4050 | `data-residency-service` | Region rules, tenant-region binding, store/process/export/replicate evaluation |
| 4051 | `legal-systems-connector-service` | Matter creation, packet export to provider, status callbacks, legal hold lifecycle |
| 4052 | `procurement-automation-service` | Questionnaire libraries, response saving, reuse suggestions, evidence coverage scoring |

## Wave 8 portal

| Port | Portal | Purpose |
|------|--------|---------|
| 3016 | `collections-operations-portal` | Receivables dashboard + dunning runs + write-off pipeline (amber/stone tone) |

## Wave 8 shared packages

`shared-collections` · `shared-signatures` · `shared-revenue-share` ·
`shared-privacy` · `shared-residency` · `shared-procurement`

## End-to-end revenue ops flow

```
Wave 7 billing-metering closes statement
  -> wave 8 collections-dunning ingests as receivable (amount + due date)
  -> aging bucket auto-refreshes on every read
  -> dunning-cadence runner walks the 5-step cadence
       Day +1   friendly_reminder        email
       Day +7   first_notice             email
       Day +21  second_notice            email
       Day +45  final_notice             call_task
       Day +60  ops_escalation           ops_escalation
  -> tenant either pays (-> paid) or creates promise-to-pay
  -> finance team submits write-off; admin approves
  -> tenant collections summary surfaces totals + bucket breakdown
```

## Signature envelope state machine

```
draft  -> sent  -> in_progress  -> completed
                      \-> declined
                      \-> voided
                      \-> expired
```

When all signers have signed, the envelope auto-completes and the
`signature-integration-service` calls
`POST /contracts/agreements/:id/sign` on the Wave 7 `contract-lifecycle-service`,
which advances the agreement to `active` / `fully_signed`.

## Revenue-share waterfall math

`shared-revenue-share` calculates outcomes deterministically:

1. Subtract any `fixedCentsBeforeSplit` pre-takes (in declared order)
2. Apply remaining splits' percentages to the post-fixed remainder
3. Clamp each split by `minimumGuaranteeCents` and `maximumCents`
4. Return per-beneficiary outcomes plus any leftover remainder

Example tree (70 / 20 / 10 split with 20 % MG of $1000 to the agency):

```
$10,000.00 settlement
  creator      70 %  -> $7,000.00
  agency       20 %  -> $2,000.00  (MG $1,000.00 wouldn't trigger here)
  platform     10 %  -> $1,000.00
remainder = $0.00
```

## Privacy decision hierarchy

`privacy-governance-service` resolves the most-restrictive rule across all
rules in a policy. Decisions rank:

```
deny  >  review_required  >  suppress  >  allow
```

A request is denied if any rule blacklists the metric, the metric is missing
from a whitelist, or the privacy class is `regulated` and any threshold
fails. Cohort or k-anon failures suppress; restricted/regulated classes that
otherwise pass require manual review.

## Residency action matrix

| Action | Enforced against |
|--------|------------------|
| `store` | `allowedStorageRegions` |
| `process` | `allowedProcessingRegions` |
| `export` | `exportBoundaries` (cross-boundary export from boundary region denied) |
| `replicate` | `crossRegionReplicationAllowed` flag |

Seeded regions on boot: `us_east`, `eu_west` (GDPR-bound, no cross-region
replication), `uk` (UK GDPR boundary), `apac_singapore`.

## Legal matter → packet export

```
legal-packet-service produces a packet (Wave 7)
  -> POST /legal-connector/matters/:id/exports {packetId}
  -> connector pulls packet metadata from legal-packet-service
  -> generates provider-specific URI (e.g. ironclad://matters/.../packet.pdf)
  -> emits legal.packet.exported
  -> provider acks via /legal-connector/exports/:id/callback
```

## Procurement reuse + scoring

`shared-procurement.scoreResponseCompleteness` returns:

| Field | Meaning |
|-------|---------|
| `completenessPct` | % of questions with non-empty answers |
| `evidenceCoveragePct` | % of `evidenceRequired` questions with `evidenceRef` |

`suggestReuse` looks up prior responses by the same tenant for the same
`questionKey` and surfaces the most recent answer plus its source response
ID, so reviewers can accept-as-is for unchanged content.

## Wave 8 RBAC additions

- `admin` is required for: tree creation, region creation, residency
  assignment, write-off approval, matter creation, hold placement,
  questionnaire publishing.
- `requireAuth` (any signed-in user) for: receivable payments, promise-to-pay
  creation, envelope creation/sending, write-off submission, response
  drafting and submission.
- Public (no auth): callback endpoints (`signature.envelope/:id/callbacks`,
  `legal-connector/exports/:id/callback`), residency evaluation, privacy
  release checks. These are designed for service-to-service traffic that
  arrives without a user JWT but should be locked down at the network
  boundary in production.

## Wave 8 known gaps (-> Wave 9)

- Sovereign key custody and advanced regional crypto boundaries
- Fully automated global tax localization
- Advanced contract negotiation / redlining workflows
- External procurement portal response-automation APIs (push-style)
- Privacy-enhancing computation for highly sensitive federated analytics
- Partner billing pass-through and revenue assurance audits
- Cross-border regulatory filing exports

## Wave 8 versioning

Wave 8 ships at **v0.8.0**. Wave 7 zip and earlier wave artifacts remain
side-by-side in `/mnt/user-data/outputs/` for reference.

---

## Wave 9 — Sovereign Deployment + Tax Localization + Redlining Workbench + Revenue Assurance + Privacy-Enhancing Compute + Cross-Border Regulatory Filing + Sales/Diligence Automation

Wave 9 turns CrownX Jewel from a globally enterprise-ready platform into a **sovereign-capable, multinationally governed, tax-aware, legally operationalized, revenue-assured, privacy-enhanced, and enterprise-sales-automated** institutional system. Wave 9 lights up sovereign tenancy, advanced tax localization, contract negotiation/redlining, settlement-to-payout audit assurance, privacy-enhancing compute over aggregates, cross-border regulatory filing exports, and reusable enterprise-diligence automation.

### What's new

**7 new services** on ports 4053-4059:

- **sovereign-deployment-service** (4053) — sovereign class taxonomy (commercial, regulated_enterprise, sovereign_dedicated, air_gapped), tenant assignments with prior-active suspension, per-tenant export-control rules with deny/review/allow evaluation, promotion-request workflow that auto-approves only commercial-tier without sovereign approval flag.
- **tax-localization-service** (4054) — jurisdiction registry (8 seeded: US-CA, US-NY, GB, DE, FR, CA, AU, JP), deterministic tax engine supporting VAT/GST/sales-tax/withholding/exempt rules with B2B reverse-charge support, royalty withholding compute, per-scope tax profiles with VAT numbers and exemption certificates.
- **redlining-negotiation-service** (4055) — contract version registry with auto-supersede of in-review siblings, redline diff computation between any two versions producing severity-classified per-clause changes, negotiation issue tracker (5 issue types), seeded clause library with fallback ranks (indemnification, liability_limit, termination, DPA, etc).
- **revenue-assurance-service** (4056) — audit runner across 5 audit types (settlement_to_ledger, ledger_to_payout, revshare_to_statement, settlement_to_revshare, tax_to_remittance) with 4-band severity classification ($1+/$10+/$100+/$1000+ critical), auto-fetches expected vs actual pairs from Wave 4 settlement-service and Wave 8 revenue-share-service, pipeline summary rollup, critical-variance event emission.
- **privacy-enhancing-compute-service** (4057) — Laplace-style deterministic-seed noise on aggregate values, epsilon-controlled privacy budget, policy resolution from Wave 8 privacy-governance-service via scopeType/scopeId, per-metric release decision (allow/suppress/review/deny), job-to-artifacts pipeline with manifest URI per job.
- **regulatory-filing-service** (4058) — filing profile registry seeded with 4 standard profiles (UK VAT quarterly HMRC, US 1099-MISC annual IRS, Germany VAT monthly, GDPR Article 30 register annual), auto-computes period key + deadline + completeness against required line items, artifact bundle assembly on file, upcoming-deadlines surface within 14-day window.
- **sales-diligence-automation-service** (4059) — opportunity stage tracking (discovery → qualification → evaluation → diligence → negotiation → executed | closed_lost), diligence workspace open auto-creates 10-item default checklist, per-item PUT for status/body/evidence, reuse suggestions surface delivered items from prior workspaces by itemKey, applyReuse copies body/evidence and marks ready, submit auto-advances opportunity to negotiation when 100% complete.

**6 new shared packages** with deterministic helpers:
- `shared-sovereignty` — `evaluateExportControl` returning deny/review/allow + `isPromotionAutoApproved`, sovereign-tier types, export-control type taxonomy
- `shared-tax` — `determineTax` with first-match rule walk (B2B reverse-charge support, inclusive/exclusive rate handling) + `applyWithholding`
- `shared-redlining` — `computeRedlineSummary` with severity classification (high: indemnification/liability/IP/termination · medium: DPA/payment/warranty/audit · low: rest) + `nextFallback` for clause library traversal
- `shared-assurance` — `compareAuditPairs` produces severity-banded variance records + `summarizeVariances` rolls up by severity and total leakage
- `shared-regulatory` — `computeFilingDeadline`, `validateFilingCompleteness`, `periodKeyForDate` (monthly/quarterly/annual normalization)
- `shared-sales` — `workspaceCompleteness`, `estimateRemainingEffort`, `advanceStage` for stage progression with guard rails, `DEFAULT_DILIGENCE_CHECKLIST` (10 standard items: SOC 2, ISO certs, SIG, DPA, subprocessors, MSA, cyber insurance, audited financials, IRP, BCDR)

**1 new portal** at port 3019:
- **sovereign-control-portal** (3019) — slate/blue dashboard with 4 KPI tiles (sovereign classes, active assignments, recent denials, pending promotions), full sovereign class table with tier badges and policy summary, recent export evaluations with decision color-coding. Sub-pages: `/classes` (full class detail cards with policy breakdown), `/assignments` (tenant assignments + promotion request register), `/export-controls` (per-tenant rules + recent evaluations).

The Wave 9 spec also defines `tax-governance-portal` (3020) and `diligence-automation-portal` (3021) as additional surfaces; Wave 9 ships sovereign-control-portal as the marquee since its workflows (sovereign class taxonomy, export-control evaluations, promotion approvals) are the most distinctive Wave 9 capability. Tax + diligence portals follow Wave 6/7/8 pattern of building only the marquee portal each wave.

### Sovereign tier taxonomy

| tier                  | regions                              | cross-region routing | key posture | promotion approval        |
|-----------------------|--------------------------------------|----------------------|-------------|---------------------------|
| commercial            | us_east, us_west, eu_west, apac      | permitted            | local KMS   | auto                      |
| regulated_enterprise  | us_east, eu_west                     | permitted            | HSM         | sovereign approval gate   |
| sovereign_dedicated   | eu_west, eu_central                  | blocked              | BYOK        | sovereign approval gate   |
| air_gapped            | us_east only                         | blocked              | HSM         | sovereign approval gate   |

### Tax engine illustration

UK VAT 20% applied to a £100 net B2C invoice produces a £20 tax line and £120 total. The same UK rule applied to a £500 net B2B invoice with a German buyer flips to **reverse-charge mode**: zero tax collected at source; the buyer self-accounts under their domestic VAT regime. Royalty withholding is applied separately via `applyWithholding(grossCents, rateBps)` — e.g. a $1,000 royalty payout at 30% withholding returns `{ withheld: 30000c, net: 70000c }`.

### Redline severity classification

| severity | clauses                                         |
|----------|-------------------------------------------------|
| high     | indemnification, liability_limit, ip_ownership, termination |
| medium   | data_processing, payment_terms, warranty, audit_rights      |
| low      | confidentiality, governing_law, other           |

### Revenue assurance variance bands

| severity | drift threshold |
|----------|-----------------|
| critical | ≥ $1,000        |
| high     | $100 – $999     |
| medium   | $10 – $99       |
| low      | $1 – $9         |

Critical variances emit a dedicated `assurance.variance.critical` event in addition to the standard `assurance.audit.completed` event so downstream incident-response systems can react immediately.

### Privacy-enhancing compute

Wave 9 adds Laplace-style deterministic-seed noise to aggregate values via `epsilon` parameter (default 1.0, smaller = more noise). Each metric is independently policy-evaluated against rules resolved from Wave 8 privacy-governance-service: cohort-too-small or k-anonymity-fail → suppress; restricted/regulated privacy class with no override → review_required or deny; otherwise → allow with noise applied. Wave 9 ships a deterministic-seed implementation; Wave 10 will wire real differential-privacy libraries (OpenDP, Tumult Analytics) behind the same shape.

### Regulatory profile catalog

| jurisdiction | filing                       | period    | deadline | format |
|--------------|------------------------------|-----------|----------|--------|
| GB           | UK VAT Return (HMRC)         | quarterly | +37 days | XML    |
| US-FED       | 1099-MISC (IRS)              | annual    | +31 days | CSV    |
| DE           | Germany VAT Return           | monthly   | +10 days | XML    |
| EU           | GDPR Article 30 Register     | annual    | +90 days | PDF    |

### Sales pipeline stage flow

```
discovery → qualification → evaluation → diligence → negotiation → executed
                                                               ↓
                                                          closed_lost
```

Opening a diligence workspace auto-advances any opportunity in {discovery, qualification, evaluation} to **diligence**. Submitting a 100%-complete workspace auto-advances **diligence → negotiation**.

### Endpoints (gateway, all under `/api/`)

| family            | endpoints |
|-------------------|-----------|
| `/sovereign/*`    | classes, assignments, export-controls (+ evaluate, evaluations), promotions (+ approve, deny, pending) |
| `/tax/*`          | jurisdictions (+ by-country), determinations (+ by-reference), withholding/compute, profiles (+ by-scope) |
| `/redlines/*`     | versions (+ status), diffs (+ review), issues (+ resolve, open), clauses (+ category, fallback) |
| `/assurance/*`    | audits (+ variances), variances (filter by severity), pipeline-summary |
| `/privacy-compute/*` | jobs (+ by status), artifacts |
| `/regulatory/*`   | profiles (+ by jurisdiction), filings (+ file, reject), upcoming-deadlines |
| `/sales/*`        | opportunities (+ advance, close-lost, by stage), diligence/workspaces (+ start, items, reuse-suggestions, apply-reuse, submit), pipeline-summary |

### Wave 9 RBAC additions

- **admin** required for: creating sovereign classes, assigning tenants to sovereign classes, creating export controls, approving/denying promotions, creating tax jurisdictions, archiving jurisdictions, creating tax profiles, adding clause-library entries, running assurance audits, creating regulatory profiles, starting/filing/rejecting regulatory filings.
- **authenticated user** required for: submitting promotion requests, creating contract versions / diffs / issues, submitting privacy-compute jobs, creating sales opportunities, opening/starting/submitting diligence workspaces, updating workspace items, applying reuse.
- **public** for: tax determinations (deterministic engine, no sensitive state), withholding compute (pure math), reading sovereign classes / tax jurisdictions / clause-library / regulatory profiles, listing diligence reuse-suggestions.

### Run the Wave 9 e2e test

```bash
docker compose -f infra/compose/docker-compose.yml up --build
# in another terminal:
pnpm e2e:wave9
```

The script (`scripts/wave9-e2e-test.sh`) walks: register admin → create tenant → assign EU sovereign class + export-control evaluations (allow EU→EU, deny EU→US) + promotion request blocked under sovereign approval → UK B2C £100 net + UK→DE B2B reverse-charge tax determinations + 30% royalty withholding → 2 contract versions + diff with severity-classified clause changes + negotiation issue + fallback clause lookup → assurance audit with synthetic pairs producing all 4 severity bands → privacy-compute job with mixed cohorts (large allowed with noise, small suppressed, public allowed) → UK VAT Q1 filing creation + file → AcmeBuyer opportunity + workspace + 8/10 items delivered + submit (80% completeness) → NextBuyerCo workspace gets reuse suggestions from prior delivered items → snapshot of all 18 Wave 9 surfaces.

### Known gaps after Wave 9 (Wave 10 candidates)

- full sovereign key custody and attestation integration
- advanced global tax filing automation and remittance workflows (beyond filing-package generation)
- live collaborative redlining UI with comment threads and approval routing
- automated dispute-to-legal escalation playbooks
- privacy-preserving computation beyond release-safe aggregates (secure-multi-party, homomorphic encryption)
- multinational incident response and regulator notice orchestration
- advanced account planning and sales forecasting integrations

## Wave 10 — Sovereign Key Custody + Global Tax Filing/Remittance + Collaborative Redlining UI + Legal Escalation Playbooks + Regulator Notice Orchestration + Enterprise Account Planning/Forecasting

Wave 10 turns CrownX Jewel from a sovereign-aware platform into a sovereign-trust-grade, regulator-operations, multinational-tax-executing, legal-collaboration, and enterprise-planning command system.

## Wave 10 services (4060–4065)

- `sovereign-key-custody-service` (4060) — custody profile registry across 4 modes (`platform_managed_standard`, `tenant_dedicated_managed`, `sovereign_isolated_managed`, `external_customer_managed_reference`); signing-key inventory with rotation/revoke; deterministic signing-policy evaluator over allowed reference types + region allowlist + daily usage cap + break-glass approver-role gate; attestation receipts with stable context digest persisted on every allowed signing event when the policy mandates attestation.
- `tax-remittance-service` (4061) — five obligation types (`vat_filing`, `withholding_remit`, `sales_tax_filing`, `1099_remit`, `annual_summary`); seven-state obligation lifecycle (`open` → `filing_in_progress` → `ready_to_remit` → `remitted` plus `overdue` / `exception` / `closed`); remittance run lifecycle (`queued` → `submitting` → `submitted` → `acknowledged` plus `failed` / `rejected` / `exception`); failure path captures a `RemittanceException` with `retry` / `escalate` / `manual_review` next-action; `roll-overdue` cron-style endpoint; `upcoming-due` 14-day window.
- `collaborative-redlining-service` (4062) — workspace lifecycle (`open` → `in_review` → `checkpoint_pending` → `approved` → `promoted_to_signature`); auto-pulls latest contract version from `redlining-negotiation-service` when caller doesn't supply one; threaded comments (4-state lifecycle); clause positions across 4 types × 5 reviewer roles; checkpoint publication snapshots unresolved-comment count and per-clause position-type histogram; `final_approval` checkpoint approval auto-flips workspace to `approved`; promote endpoint advances to `promoted_to_signature`.
- `legal-escalation-service` (4063) — 5-level severity ladder (`advisory` → `urgent_review` → `legal_hold_candidate` → `regulator_sensitive` → `executive_escalation`); 7 source types; deterministic playbook decision matrix produces counsel routing, packet assembly flag, notice obligation check, legal hold flag, executive notification flag; `/matter` POST calls `legal-systems-connector-service`; `/packet` POST calls `legal-packet-service`; full escalation event log.
- `regulator-notice-service` (4064) — 10 seeded routing rules (EU/EDPB 3-day, UK ICO 3-day, DE BfDI 3-day, US-CA AG 30-day, US-NY DFS 3-day, ENISA 7-day, HMRC 30-day, IRS 30-day, EC DG-CNECT 14-day, CISA 7-day); when multiple rules match a (jurisdiction, source) pair, **one notice is generated per regulator** (cross-jurisdiction notification matrix); 8-state lifecycle (`draft` → `approval_pending` → `approved` → `submitted` → `acknowledged` → `responded` → `closed`, plus `rejected`); `upcoming-deadlines` 14-day window.
- `enterprise-planning-service` (4065) — strategic accounts with sovereignty-tier linkage; account plans with `AccountPlanMilestone[]` and auto-derived readiness score; scenario models holding `ForecastAssumptions`; forecast bundles invoke `runForecast` for `best_case` / `base_case` / `conservative` / `worst_case` scenarios; best-effort CRM-baseline pull from `reporting-service` for variance-vs-CRM computation (Wave 11 swaps to `crm-revops-sync-service`); executive pipeline-summary roll-up.

## Wave 10 portal

- `legal-collaboration-portal` (3022) — Next.js 15 App Router portal serving as the marquee Wave 10 surface. Pages: dashboard (KPI cards + recent workspaces table + escalation severity mix), workspaces (per-workspace summary cards with stats and latest checkpoint), escalations (severity-ladder table with notice/hold/exec flag chips). The Wave 10 spec also defines tax-governance-portal (3023) and enterprise-planning-portal (3024); these are deferred to spec only, matching the Wave 6/7/8/9 pattern of building one portal per wave.

## Wave 10 shared packages

- `shared-custody` — `evaluateSigningPolicy` + `buildAttestationReceipt` deterministic primitives.
- `shared-forecasting` — `runForecast` deterministic 4-scenario model with growth bonus/haircut, readiness drag, sovereignty drag, procurement cycle drag, partner uplift, plus `computeReadinessScore` from milestone status weights.

## Sovereign signing flow

```
sovereign tenant requests sensitive signing action
  -> sovereign-key-custody-service resolves tenant custody profile
  -> evaluateSigningPolicy walks allowedReferenceTypes + allowedRegions + dailyUsageCap + break-glass gate
  -> signing event persisted with evaluation reasons
  -> if allowed + attestationRequired, buildAttestationReceipt -> custody.attestation.issued event
  -> if denied, custody.signing.denied event
  -> downstream packet/export references attestation.contextDigest
```

## Tax filing + remittance flow

```
tax period closes
  -> tax-localization-service identifies determinations (Wave 9)
  -> tax-remittance-service createObligation (status=open)
  -> link to regulatory-filing-service run via PUT /tax/obligations/:id/link-filing (status=filing_in_progress)
  -> when filing assembled, PUT /tax/obligations/:id/ready-to-remit
  -> POST /tax/remittances starts a run (status=queued)
  -> POST /tax/remittances/:id/submit                  (status=submitted, submissionRef captured)
  -> POST /tax/remittances/:id/acknowledge             (status=acknowledged, obligation->remitted)
  -> failure path: POST /tax/remittances/:id/fail with reason+nextAction
                   captures RemittanceException for retry/escalate/manual_review
```

## Collaborative negotiation flow

```
agreement enters negotiation
  -> POST /api/collab-redline/workspaces (auto-pulls latest version from redlining-negotiation-service)
  -> reviewers assigned (5 roles: internal_legal / external_counsel / business_owner / counterparty / executive_approver)
  -> threaded comments + clause positions accumulate
  -> POST /api/collab-redline/checkpoints (snapshots unresolved-comment count + position-type histogram)
  -> decide approved -> if final_approval, workspace flips to approved
  -> POST /api/collab-redline/workspaces/:id/promote -> promoted_to_signature
```

## Legal escalation playbook decision matrix

| Severity              | Routing target      | Packet | Notice check | Legal hold | Exec flag |
|-----------------------|---------------------|--------|--------------|------------|-----------|
| advisory              | internal_legal      | no     | no           | no         | no        |
| urgent_review         | internal_legal      | yes    | no           | no         | no        |
| legal_hold_candidate  | internal_legal      | yes    | no           | yes        | no        |
| regulator_sensitive   | external_counsel    | yes    | yes          | no         | no        |
| executive_escalation  | executive_counsel   | yes    | yes          | yes        | yes       |

Source-type overrides: `regulator_trigger` forces notice obligation check; `residency_breach` and `sovereign_restriction` force both notice obligation check and legal hold; `claim` at regulator_sensitive or higher routes to external_counsel regardless.

## Regulator routing matrix (seeded)

| Jurisdiction | Source type | Regulator | Deadline | Response pack |
|--------------|-------------|-----------|----------|---------------|
| EU           | data_breach | EDPB      | 3 days   | yes           |
| GB           | data_breach | ICO       | 3 days   | yes           |
| DE           | data_breach | BfDI      | 3 days   | yes           |
| US-CA        | data_breach | CA AG     | 30 days  | no            |
| US-NY        | data_breach | NY DFS    | 3 days   | yes           |
| EU           | incident    | ENISA     | 7 days   | no            |
| GB           | tax_finding | HMRC      | 30 days  | yes           |
| US-FED       | tax_finding | IRS       | 30 days  | yes           |
| EU           | sovereign_event | EC DG-CNECT | 14 days | yes      |
| US-FED       | sovereign_event | CISA   | 7 days  | yes           |

## Forecast scenario types

| Scenario      | Adjustment to growthBps |
|---------------|-------------------------|
| best_case     | +500 bps                |
| base_case     | as-given                |
| conservative  | -500 bps                |
| worst_case    | -1000 bps               |

Drags applied to all scenarios: readiness drag (each missing 10 readiness points = -3% revenue), sovereignty drag (each 10 complexity points = -2% revenue), procurement cycle drag (every 30 days = -2% revenue). Optional partner uplift adds revenue. Confidence band: high if readiness ≥ 80 + sovereignty complexity ≤ 20 + close probability ≥ 70%; low if readiness < 50 or sovereignty complexity ≥ 60 or close probability < 30%; medium otherwise.

## Wave 10 RBAC additions

- `compliance_officer` and `admin` can create / route / matter-link / packet-link legal escalations and approve/submit regulator notices.
- `strategist` and `admin` can create strategic accounts, account plans, scenario models, and forecast runs.
- `admin` is required for custody-profile creation, key creation/rotation/revoke, tax-obligation creation, and remittance fail/acknowledge.
- All authenticated users can open redline workspaces and post comments/positions.

## Wave 10 known gaps (queued for Wave 11)

- Externally-attestable sovereign trust exports (formal sovereign attestation export bundles for auditors)
- Real remittance provider/payment rail integrations per jurisdiction (jurisdiction-specific remittance rail connectors)
- Fully synchronous collaborative editing transport (real-time co-editing transport layer)
- Regulator portal connectors and inbound response ingestion
- Advanced driver-based forecast models with multi-driver bottom-up inputs
- CRM/RevOps forecast synchronization
- Global incident orchestration by sovereignty class

## Wave 11 — External Sovereign Attestation Exports + Jurisdiction-Specific Remittance Rail Connectors + Real-Time Collaborative Editing Transport + Regulator Portal Connectors + Advanced Driver-Based Forecast Models + CRM/RevOps Forecast Sync + Global Incident Orchestration by Sovereignty Class

Wave 11 turns CrownX Jewel from a sovereign-trust, regulator-operations, tax-execution, legal-collaboration, and enterprise-planning command system into an externally attestable, rail-connected, real-time collaborative, regulator-integrated, driver-modeled, commercial-sync, and sovereignty-aware incident command platform.

## Wave 11 services (4066–4072)

- `sovereign-attestation-export-service` (4066) — five attestation packet types (`tenant_period_summary`, `key_usage_chain`, `control_summary`, `audit_bundle`, `regulator_disclosure`); best-effort source pull from `sovereign-key-custody-service` (custody profile + last 50 attestations) and `sovereign-deployment-service` (sovereign assignment); tamper-evident manifest with chained digest referencing the prior packet of the same type for tamper-evident chains; optional legal-packet wrapping via `legal-packet-service`; packet lifecycle (`assembled` → `signed` → `exported`, plus `revoked`); export request workflow with `pending` → `approved` (issues a receipt with a `verify.crownx.example/{receiptId}` placeholder URL) → `denied`. Verify endpoint allows external parties to confirm digest match against supplied source content.
- `remittance-rail-connector-service` (4067) — seven seeded rails (US-FED ACH/wire via `stripe_treasury`, GB BACS via `modulr` + HMRC gateway via `regulator_native`, DE/FR SEPA via `currencycloud`, EU SEPA via `wise_business`); six rail types × six providers; idempotent retries within per-rail window; full submission lifecycle (`queued` → `submitting` → `submitted` → `acknowledged` → `reconciled`, plus `rejected` / `failed` branches); four receipt types (`submission_ack`, `payment_confirmation`, `filing_receipt`, `rejection_notice`) auto-generated at lifecycle transitions; retry attempts counter; best-effort upstream sync to `tax-remittance-service` on reconcile.
- `realtime-collaboration-service` (4068) — four workspace types (`redline_workspace`, `diligence_workspace`, `regulator_response`, `incident_war_room`); session lifecycle (`open` → `paused` → `checkpoint_published` → `closed`); starting a new session auto-pauses any existing open session for the same workspace; presence with four states (`active`/`idle`/`away`/`left`) + cursor anchor + idle-sweep cron endpoint (5-minute threshold); eight operation kinds (`comment_added`/`resolved`, `clause_proposed`/`accepted`/`rejected`, `section_locked`/`unlocked`, `checkpoint_requested`); **full optimistic-lock + section-lock merge safeguards** — operations with stale `expectedSequence` get rejected with `merge_conflict_*` reason, operations on a locked section by another user get rejected with `section_locked_by_*` reason, both rejected ops persisted to the operations log for audit, accepted ops increment session sequenceNumber atomically.
- `regulator-portal-connector-service` (4069) — seven seeded portal connectors (EDPB EU, ICO UK, BfDI DE, HMRC GB, IRS US-FED, NY DFS US-NY, CISA US-FED); submit notice flow generates externalRef + tracks portal-side status; **inbound response ingestion** with six response types (`acknowledgement` / `request_for_info` / `decision_letter` / `rejection_notice` / `extension_grant` / `closure_notice`); automatic effective-deadline recomputation when the regulator grants extensions (`newDueDate` direct or `extensionDays` relative); best-effort upstream sync to `regulator-notice-service` on response ingestion (acknowledgement → ack endpoint, decision_letter → respond endpoint, closure_notice → close endpoint); response-pack generation for `request_for_info` / `decision_letter` types.
- `driver-forecast-model-service` (4070) — eight-driver canonical model (`baseline_revenue_cents`, `growth_bps`, `close_probability_bps`, `readiness_score`, `sovereignty_complexity`, `procurement_cycle_days`, `partner_uplift_bps`, `residency_constraints_count`) across eight categories (`revenue` / `usage` / `procurement` / `partner` / `residency` / `sovereignty` / `implementation` / `renewal`) and six units (`bps` / `days` / `score_0_100` / `cents` / `count` / `pct`); `runModel` builds `ForecastAssumptions` from caller-supplied driver inputs (with defaults filled in) then invokes `runForecast` from `shared-forecasting`; emits `forecast.driver.run` event; **sensitivity analysis** — `runSensitivity` re-runs the same scenario with one driver perturbed (absolute or percent delta), reports `varianceCents = perturbed.expectedRevenueCents - baseline.expectedRevenueCents`.
- `crm-revops-sync-service` (4071) — four CRM providers (`salesforce`, `hubspot`, `dynamics`, `manual_csv`) with **per-provider stage probability normalization tables** mapping native CRM stages to canonical platform stages (`discovery` / `qualification` / `evaluation` / `diligence` / `negotiation` / `executed` / `closed_lost`); upsert-by-externalId account + opportunity sync with four-state `SyncStatus` (`synced` / `pending` / `stale` / `error`); default probability ladder per platform stage (10%/20%/35%/60%/80%/100%/0%); `reconcile` pulls platform forecast best-effort from `enterprise-planning-service` (`base_case` scenario), computes CRM-side weighted sum from non-`closed_lost` opportunities, returns `ForecastReconciliation` with `platformExpected` vs `crmWeighted` variance both in cents and percent of CRM forecast; `markStale` cron-style endpoint pushes accounts/opps past max-age cutoff to `stale`.
- `sovereignty-incident-orchestration-service` (4072) — eight incident types (`data_breach`, `service_outage`, `regulator_inquiry`, `key_compromise`, `residency_violation`, `subprocessor_failure`, `fraud_detected`, `compliance_breach`); incident classification using `classifyIncident` from `shared-incident` (sovereign tier escalates severity, type-driven hooks, severity floors); runbook action emission using `selectRunbookActions` (10 deterministic action types); fan-out POSTs to `legal-escalation-service` / `regulator-notice-service` / `data-residency-service` / `sovereign-key-custody-service` per action type; postmortem assembly with output URI; full incident event log with seven event types; six-state lifecycle (`triaging` → `active` → `contained` → `remediating` → `resolved` → `closed`).

## Wave 11 portal

- `incident-command-portal` (3025) — Next.js 15 App Router portal serving as the marquee Wave 11 surface. Slate/red incident-command theme. Pages: dashboard (4 KPI cards for active/critical/contained/pending postmortems, severity-by-sovereignty-class grid, recent runbook actions table), incidents subpage (severity + sovereignty class chips, legal escalation + regulator notice linkage, postmortem indicator), runbook actions subpage (per-incident action progress).

The Wave 11 spec also defines `tax-remittance-monitoring-portal` (3023) and `forecast-command-portal` (3024); these are deferred to spec only, matching the one-portal-per-wave pattern.

## Wave 11 shared packages

- `shared-attestation` — `buildManifest` (deterministic FNV-1a digest, stably-ordered concatenation, prior-manifest chain digest for tamper-evident chains), `verifyManifest`, `buildExportReceipt` with `externalVerificationUri` placeholder for Wave 12 verifier wiring.
- `shared-incident` — `classifyIncident` (sovereignty-tier severity escalation: `sovereign_dedicated` and `air_gapped` bump severity by one band; `data_breach` + `compliance_breach` force regulator notice + legal escalation; `key_compromise` forces export freeze; `residency_violation` forces residency review + freeze; cross-region forces residency review; regulated data + non-low forces regulator notice) and `selectRunbookActions` (10 deterministic action types).

## Attestation packet types

| Packet type             | What it bundles                                                                  |
|-------------------------|----------------------------------------------------------------------------------|
| `tenant_period_summary` | Custody profile + last 50 attestations + sovereign assignment for a period      |
| `key_usage_chain`       | Custody attestations for the period (verifiable signing chain)                  |
| `control_summary`       | Sovereign export evaluations + custody policy snapshot                           |
| `audit_bundle`          | All of the above plus optional legal-packet wrap                                 |
| `regulator_disclosure`  | Control summary + regulator-notice references                                    |

## Remittance rail provider matrix (seeded)

| Jurisdiction | Rail type        | Provider          | Settlement window |
|--------------|------------------|-------------------|-------------------|
| US-FED       | ACH              | stripe_treasury   | T+2               |
| US-FED       | wire             | stripe_treasury   | same_day          |
| GB           | BACS             | modulr            | T+3               |
| GB           | regulator_portal | regulator_native  | n/a (HMRC)        |
| DE           | SEPA             | currencycloud     | T+1               |
| FR           | SEPA             | currencycloud     | T+1               |
| EU           | SEPA             | wise_business     | T+1               |

## Realtime collaboration merge safeguard rules

1. **Optimistic lock**: every op carries an optional `expectedSequence`. If the session's current `sequenceNumber` doesn't match, op rejects with `merge_conflict_expected_X_actual_Y`.
2. **Section lock**: a `section_locked` op records `lockedByUserId` for the anchor. Subsequent ops on that anchor by other users reject with `section_locked_by_<userId>` until a `section_unlocked` op fires.
3. **Audit-grade rejection**: rejected ops are persisted to the operations log with `accepted=false` + `rejectionReason`, so the merge history is reviewable.
4. **Atomic accept**: accepted ops increment `sequenceNumber` exactly once before persisting, so concurrent accepts cannot share a sequence.

## Regulator portal connector matrix (seeded)

| Jurisdiction | Regulator | Provider         | Inbound response types supported            |
|--------------|-----------|------------------|---------------------------------------------|
| EU           | EDPB      | edpb_portal      | ack / RFI / decision / extension / closure  |
| GB           | ICO       | ico_portal       | ack / RFI / decision / extension / closure  |
| DE           | BfDI      | bfdi_portal      | ack / RFI / decision / extension / closure  |
| GB           | HMRC      | hmrc_gateway     | ack / decision / closure                    |
| US-FED       | IRS       | irs_efile        | ack / decision / rejection / closure        |
| US-NY        | NY DFS    | ny_dfs_portal    | ack / RFI / decision / closure              |
| US-FED       | CISA      | cisa_portal      | ack / RFI / decision / closure              |

## Driver forecast model — 8-driver inventory

| Driver key                     | Category       | Unit         |
|--------------------------------|----------------|--------------|
| `baseline_revenue_cents`       | revenue        | cents        |
| `growth_bps`                   | revenue        | bps          |
| `close_probability_bps`        | revenue        | bps          |
| `readiness_score`              | implementation | score_0_100  |
| `sovereignty_complexity`       | sovereignty    | score_0_100  |
| `procurement_cycle_days`       | procurement    | days         |
| `partner_uplift_bps`           | partner        | bps          |
| `residency_constraints_count`  | residency      | count        |

## Sovereignty incident classification

Severity bumping by sovereignty class:

| Sovereignty tier         | Severity adjustment              |
|--------------------------|----------------------------------|
| `commercial`             | as-given                         |
| `regulated_enterprise`   | as-given                         |
| `sovereign_dedicated`    | bump by one band (low→medium…)   |
| `air_gapped`             | bump by one band                 |

Type-driven escalations:

| Incident type           | Forced hooks                                         |
|-------------------------|------------------------------------------------------|
| `data_breach`           | regulator notice + legal escalation                  |
| `compliance_breach`     | regulator notice + legal escalation                  |
| `key_compromise`        | export freeze + legal escalation                     |
| `residency_violation`   | residency review + freeze + legal escalation         |
| (cross-region)          | residency review                                     |
| (regulated data, non-low)| regulator notice                                    |

Runbook action ladder (executed in order):

```
notify_executives -> freeze_export -> open_residency_review
  -> open_legal_escalation [-> engage_external_counsel if critical]
  -> open_regulator_notice -> rotate_keys (sovereign_dedicated/air_gapped, non-low)
  -> [if critical: engage_breach_response, isolate_tenant]
  -> publish_postmortem
```

## Wave 11 RBAC additions

- `admin` is required for: attestation packet sign/revoke, attestation export approve/deny, rail registry edits, regulator-portal inbound ingestion, CRM mark-stale, custody/sovereign endpoints in fan-out paths.
- `compliance_officer` and `admin` can: create/route incidents, run runbook actions, ingest regulator portal responses (when proxied through compliance flows), submit regulator portal refs.
- `strategist` and `admin` can: create driver-forecast runs, run sensitivities, sync CRM accounts/opportunities, run reconciliations.
- All authenticated users can: open realtime sessions, upsert presence, apply ops (subject to merge safeguards).

## Wave 11 known gaps (queued for Wave 12)

- Externally-verifiable attestation validation portals (public verifier endpoints with signature verification)
- True jurisdiction-specific payment/remittance provider adapters (replacing simulated rails with real provider SDKs)
- Richer collaborative editing conflict resolution (CRDT/OT-grade document merging) and document rendering
- Deeper inbound regulator document parsing and response suggestion intelligence
- Bottom-up financial model packs linked to billing and delivery metrics (true bottom-up driver rollups)
- Integrated incident simulation and tabletop exercises by sovereignty class
- Executive command forecast console unifying KPIs across all Wave 11 surfaces
