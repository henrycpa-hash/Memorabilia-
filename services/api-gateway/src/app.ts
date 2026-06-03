import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify, rateLimit, corsOrigin } from "@crownx-jewel/shared-kernel";
import jwt from "@fastify/jwt";
import { registerHealthRoutes } from "./routes/health";
import { registerIdentityRoutes } from "./routes/identity";
import { registerAssetRoutes } from "./routes/assets";
import { registerAuthRoutes } from "./routes/auth";
import { registerCoaRoutes } from "./routes/coa";
import { registerMarketplaceRoutes } from "./routes/marketplace";
import { registerRoyaltyRoutes } from "./routes/royalty";
import { registerPublicStoryRoutes } from "./routes/public-story";
import { registerReferralRoutes } from "./routes/referral";
import { registerNotificationRoutes } from "./routes/notification";
import { registerAuctionRoutes } from "./routes/auction";
import { registerOfferRoutes } from "./routes/offer";
import { registerWatchlistRoutes } from "./routes/watchlist";
import { registerLedgerRoutes } from "./routes/ledger";
import { registerRankingRoutes } from "./routes/ranking";
import { registerAuditRoutes } from "./routes/audit";
import { registerSettlementRoutes } from "./routes/settlement";
import { registerDisputeRoutes } from "./routes/dispute";
import { registerFraudRoutes } from "./routes/fraud";
import { registerCampaignRoutes } from "./routes/campaign";
import { registerRenderRoutes } from "./routes/render";
import { registerWarehouseRoutes } from "./routes/warehouse";
import { registerAutomationRoutes } from "./routes/automation";
import { registerPaymentRoutes } from "./routes/payment";
import { registerShippingRoutes } from "./routes/shipping";
import { registerInsuranceRoutes } from "./routes/insurance";
import { registerMlRiskRoutes } from "./routes/ml-risk";
import { registerExperimentRoutes } from "./routes/experimentation";
import { registerCrmRoutes } from "./routes/crm";
import { registerReportingRoutes } from "./routes/reporting";
import { registerSocialPublishingRoutes } from "./routes/social-publishing";
import { registerPartnerIntegrationRoutes } from "./routes/partner";
import { registerTenancyRoutes } from "./routes/tenancy";
import { registerAgencyRoutes as registerAgencyTeamRoutes } from "./routes/agency";
import { registerFinanceExportRoutes } from "./routes/finance-export";
import { registerConnectorRoutes } from "./routes/connector";
import { registerTrainingRoutes } from "./routes/training";
import { registerMetricsRoutes } from "./routes/metrics";
import { registerPolicyRoutes } from "./routes/policy";
// Wave 7
import { registerSsoRoutes } from "./routes/sso";
import { registerBillingRoutes } from "./routes/billing";
import { registerErpRoutes } from "./routes/erp";
import { registerContractRoutes } from "./routes/contracts";
import { registerLegalPacketRoutes } from "./routes/legal";
import { registerPolicySandboxRoutes } from "./routes/policy-sandbox";
import { registerFederatedAnalyticsRoutes } from "./routes/federated-analytics";
import { registerSlaRoutes } from "./routes/sla";
// Wave 8
import { registerCollectionsRoutes } from "./routes/collections";
import { registerSignatureRoutes } from "./routes/signatures";
import { registerRevShareRoutes } from "./routes/revshare";
import { registerPrivacyRoutes } from "./routes/privacy";
import { registerResidencyRoutes } from "./routes/residency";
import { registerLegalConnectorRoutes } from "./routes/legal-connector";
import { registerProcurementRoutes } from "./routes/procurement";
// Wave 9
import { registerSovereignGatewayRoutes } from "./routes/sovereign";
import { registerTaxRoutes } from "./routes/tax";
import { registerRedliningRoutes } from "./routes/redlining";
import { registerAssuranceRoutes } from "./routes/assurance";
import { registerPrivacyComputeRoutes } from "./routes/privacy-compute";
import { registerRegulatoryRoutes } from "./routes/regulatory";
import { registerSalesDiligenceRoutes } from "./routes/sales-diligence";
// Wave 10
import { registerCustodyGatewayRoutes } from "./routes/custody";
import { registerTaxRemittanceGatewayRoutes } from "./routes/tax-remittance";
import { registerCollabRedlineGatewayRoutes } from "./routes/collab-redline";
import { registerLegalEscalationGatewayRoutes } from "./routes/legal-escalation";
import { registerRegulatorNoticeGatewayRoutes } from "./routes/regulator-notice";
import { registerPlanningGatewayRoutes } from "./routes/planning";
// Wave 11
import { registerAttestationGatewayRoutes } from "./routes/attestation";
import { registerRailsGatewayRoutes } from "./routes/rails";
import { registerRealtimeGatewayRoutes } from "./routes/realtime";
import { registerRegulatorPortalGatewayRoutes } from "./routes/regulator-portal";
import { registerForecastDriversGatewayRoutes } from "./routes/forecast-drivers";
import { registerCrmRevopsGatewayRoutes } from "./routes/crm-revops";
import { registerSovereigntyIncidentGatewayRoutes } from "./routes/sovereignty-incidents";
// CrownX revamp (additive: passkey auth, waitlist, consumer pricing reads)
import { registerCrownxRoutes } from "./routes/crownx";

export async function buildGateway() {
  // bodyLimit caps request size (DoS / oversized-payload defence); trustProxy so
  // per-IP rate limiting sees the real client behind a load balancer.
  const app = Fastify({ logger: true, bodyLimit: Number(process.env.GATEWAY_BODY_LIMIT || 1_048_576), trustProxy: true });

  // a hardcoded JWT secret in production is a critical vuln — refuse to start
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production (refusing to start with a default secret)");
  }
  if (!jwtSecret) console.warn("[gateway] JWT_SECRET not set — using a dev secret. Set JWT_SECRET in production.");

  await app.register(cors, { origin: corsOrigin(), credentials: false, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], maxAge: 600 });
  await app.register(jwt, { secret: jwtSecret || "dev-secret-not-for-production" });
  // edge throttle — abuse/brute-force protection (generous; /health exempt)
  rateLimit(app);

  // Wave 1
  registerHealthRoutes(app);
  registerIdentityRoutes(app);
  registerAssetRoutes(app);
  registerAuthRoutes(app);
  registerCoaRoutes(app);
  registerMarketplaceRoutes(app);
  registerRoyaltyRoutes(app);

  // Wave 2
  registerPublicStoryRoutes(app);
  registerReferralRoutes(app);
  registerNotificationRoutes(app);

  // Wave 3
  registerAuctionRoutes(app);
  registerOfferRoutes(app);
  registerWatchlistRoutes(app);
  registerLedgerRoutes(app);
  registerRankingRoutes(app);
  registerAuditRoutes(app);

  // Wave 4
  registerSettlementRoutes(app);
  registerDisputeRoutes(app);
  registerFraudRoutes(app);
  registerCampaignRoutes(app);
  registerRenderRoutes(app);
  registerWarehouseRoutes(app);
  registerAutomationRoutes(app);

  // Wave 5
  registerPaymentRoutes(app);
  registerShippingRoutes(app);
  registerInsuranceRoutes(app);
  registerMlRiskRoutes(app);
  registerExperimentRoutes(app);
  registerCrmRoutes(app);
  registerReportingRoutes(app);
  registerSocialPublishingRoutes(app);

  // Wave 6
  registerPartnerIntegrationRoutes(app);
  registerTenancyRoutes(app);
  registerAgencyTeamRoutes(app);
  registerFinanceExportRoutes(app);
  registerConnectorRoutes(app);
  registerTrainingRoutes(app);
  registerMetricsRoutes(app);
  registerPolicyRoutes(app);

  // Wave 7
  registerSsoRoutes(app);
  registerBillingRoutes(app);
  registerErpRoutes(app);
  registerContractRoutes(app);
  registerLegalPacketRoutes(app);
  registerPolicySandboxRoutes(app);
  registerFederatedAnalyticsRoutes(app);
  registerSlaRoutes(app);

  // Wave 8
  registerCollectionsRoutes(app);
  registerSignatureRoutes(app);
  registerRevShareRoutes(app);
  registerPrivacyRoutes(app);
  registerResidencyRoutes(app);
  registerLegalConnectorRoutes(app);
  registerProcurementRoutes(app);

  // Wave 9
  registerSovereignGatewayRoutes(app);
  registerTaxRoutes(app);
  registerRedliningRoutes(app);
  registerAssuranceRoutes(app);
  registerPrivacyComputeRoutes(app);
  registerRegulatoryRoutes(app);
  registerSalesDiligenceRoutes(app);
  // Wave 10
  registerCustodyGatewayRoutes(app);
  registerTaxRemittanceGatewayRoutes(app);
  registerCollabRedlineGatewayRoutes(app);
  registerLegalEscalationGatewayRoutes(app);
  registerRegulatorNoticeGatewayRoutes(app);
  registerPlanningGatewayRoutes(app);
  // Wave 11
  registerAttestationGatewayRoutes(app);
  registerRailsGatewayRoutes(app);
  registerRealtimeGatewayRoutes(app);
  registerRegulatorPortalGatewayRoutes(app);
  registerForecastDriversGatewayRoutes(app);
  registerCrmRevopsGatewayRoutes(app);
  registerSovereigntyIncidentGatewayRoutes(app);

  // CrownX revamp — additive surfaces (no pricing-lock files touched)
  registerCrownxRoutes(app);

  hardenFastify(app, "api-gateway");
  return app;
}
