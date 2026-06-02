/**
 * Canonical event names across CrownX Jewel.
 *
 * Naming convention: <bounded_context>.<aggregate>.<verb_past>
 *
 *   identity.user.registered
 *   asset.evidence.added
 *   auction.bid.placed
 *
 * Services should reference these constants rather than typing strings inline
 * so renames stay safe and event consumers can switch on the enum.
 */
export const EventTypes = {
  // ---------- Wave 1 ----------
  UserRegistered: "identity.user.registered",
  CreatorCreated: "identity.creator.created",
  AssetCreated: "asset.asset.created",
  EvidenceAdded: "asset.evidence.added",
  AssetApproved: "asset.asset.approved",
  AssetTransferred: "asset.asset.transferred",
  AuthCaseOpened: "authentication.case.opened",
  AuthCaseApproved: "authentication.case.approved",
  CoaIssued: "coa.coa.issued",
  ListingCreated: "marketplace.listing.created",
  ListingSold: "marketplace.listing.sold",
  OrderCompleted: "marketplace.order.completed",
  RoyaltyRuleCreated: "royalty.rule.created",
  RoyaltyDistributionPosted: "royalty.distribution.posted",

  // ---------- Wave 2 ----------
  ReferralCodeCreated: "referral.code.created",
  ReferralConverted: "referral.converted",
  NotificationCreated: "notification.created",

  // ---------- Wave 3: market dynamics ----------
  AuctionCreated: "auction.created",
  AuctionBidPlaced: "auction.bid.placed",
  AuctionClosed: "auction.closed",
  OfferSubmitted: "offer.submitted",
  OfferCountered: "offer.countered",
  OfferAccepted: "offer.accepted",
  OfferRejected: "offer.rejected",
  WatchlistAdded: "watchlist.added",
  WatchlistRemoved: "watchlist.removed",

  // ---------- Wave 3: financial traceability ----------
  LedgerEntryPosted: "ledger.entry.posted",
  PayoutItemCreated: "payout.item.created",
  PayoutBatchCreated: "payout.batch.created",

  // ---------- Wave 3: virality + growth ----------
  ShareCardCreated: "share.card.created",
  RankingRecalculated: "ranking.recalculated",
  TimelineAppended: "timeline.appended",

  // ---------- Wave 3: audit ----------
  AuditAppended: "audit.appended",

  // ---------- Wave 4: settlement ----------
  SettlementCreated: "settlement.created",
  SettlementHeld: "settlement.held",
  SettlementReleased: "settlement.released_from_hold",
  SettlementCompleted: "settlement.completed",
  SettlementRefunded: "settlement.refunded",
  SettlementPayoutScheduled: "settlement.payout_scheduled",

  // ---------- Wave 4: dispute ----------
  DisputeOpened: "dispute.opened",
  DisputeResolved: "dispute.resolved",

  // ---------- Wave 4: fraud + reputation ----------
  FraudScoreEvaluated: "fraud.score.evaluated",
  FraudAlertRaised: "fraud.alert.raised",
  ReputationRecomputed: "reputation.recomputed",

  // ---------- Wave 4: campaign ----------
  CampaignCreated: "campaign.created",
  CampaignLaunched: "campaign.launched",
  CampaignClicked: "campaign.clicked",
  CampaignConverted: "campaign.converted",

  // ---------- Wave 4: render + automation + warehouse ----------
  RenderJobQueued: "render.job.queued",
  RenderJobCompleted: "render.job.completed",
  AutomationTriggered: "automation.triggered",
  WarehouseFactInserted: "warehouse.fact.inserted",

  // ---------- Wave 4: auction outcomes ----------
  AuctionClosedSold: "auction.closed.sold",
  AuctionClosedNoSale: "auction.closed.no_sale",

  // ---------- Wave 5: payment ----------
  PaymentIntentCreated: "payment.intent.created",
  PaymentIntentCaptured: "payment.intent.captured",
  PaymentIntentRefunded: "payment.intent.refunded",
  PaymentIntentVoided: "payment.intent.voided",
  PayoutInitiated: "payment.payout.initiated",
  PayoutPaid: "payment.payout.paid",

  // ---------- Wave 5: shipping ----------
  ShippingLabelCreated: "shipping.label.created",
  ShipmentPickedUp: "shipping.picked_up",
  ShipmentInTransit: "shipping.in_transit",
  ShipmentOutForDelivery: "shipping.out_for_delivery",
  ShipmentDelivered: "shipping.delivered",
  ShipmentException: "shipping.exception",
  ShipmentLost: "shipping.lost",

  // ---------- Wave 5: insurance ----------
  InsurancePolicyBound: "insurance.policy.bound",
  ClaimOpened: "insurance.claim.opened",
  ClaimResolved: "insurance.claim.resolved",

  // ---------- Wave 5: ml-risk ----------
  MlInferenceScored: "ml.inference.scored",
  MlOutcomeRecorded: "ml.outcome.recorded",

  // ---------- Wave 5: experimentation ----------
  ExperimentExposed: "experiment.exposed",
  ExperimentConverted: "experiment.converted",

  // ---------- Wave 5: creator-crm ----------
  CrmSegmentCreated: "crm.segment.created",
  CrmSegmentMaterialized: "crm.segment.materialized",

  // ---------- Wave 5: reporting + social ----------
  ReportGenerated: "reporting.report.generated",
  SocialPostPublished: "social.post.published",

  // ---------- Wave 6: partner integration ----------
  PartnerCreated: "partner.created",
  PartnerSuspended: "partner.suspended",
  PartnerInventorySynced: "partner.inventory.synced",
  PartnerInventoryMapped: "partner.inventory.mapped",
  PartnerWebhookReceived: "partner.webhook.received",

  // ---------- Wave 6: tenancy ----------
  TenantCreated: "tenancy.tenant.created",
  TenantBrandingUpdated: "tenancy.branding.updated",
  TenantSettingsUpdated: "tenancy.settings.updated",
  TenantFlagToggled: "tenancy.flag.toggled",
  TenantPolicyAssigned: "tenancy.policy.assigned",

  // ---------- Wave 6: agency / team ----------
  AgencyOrgCreated: "agency.org.created",
  AgencyMemberAdded: "agency.member.added",
  AgencyCreatorAffiliated: "agency.creator.affiliated",
  ApprovalOpened: "agency.approval.opened",
  ApprovalDecided: "agency.approval.decided",

  // ---------- Wave 6: finance export ----------
  FinanceInvoiceIssued: "finance.invoice.issued",
  FinanceInvoicePaid: "finance.invoice.paid",
  FinanceInvoiceVoided: "finance.invoice.voided",
  FinanceExportCreated: "finance.export.created",

  // ---------- Wave 6: connector runtime ----------
  ConnectorRegistered: "connector.registered",
  ConnectorInvoked: "connector.invoked",
  ConnectorCircuitOpened: "connector.circuit.opened",
  ConnectorCircuitReset: "connector.circuit.reset",

  // ---------- Wave 6: model training ----------
  TrainingLabelAdded: "training.label.added",
  TrainingDatasetBuilt: "training.dataset.built",
  TrainingJobStarted: "training.job.started",
  TrainingCandidateCreated: "training.candidate.created",
  TrainingCandidatePromoted: "training.candidate.promoted",

  // ---------- Wave 6: semantic metrics ----------
  MetricsCustomRegistered: "metrics.custom.registered",
  MetricsEvaluated: "metrics.evaluated",

  // ---------- Wave 6: policy compliance ----------
  PolicyPackCreated: "policy.pack.created",
  PolicyPackArchived: "policy.pack.archived",
  PolicyEvaluated: "policy.evaluated",

  // ---------- Wave 7: enterprise SSO ----------
  SsoProviderCreated: "sso.provider.created",
  SsoProviderSuspended: "sso.provider.suspended",
  SsoScimSyncCompleted: "sso.scim.sync.completed",
  SsoSessionBuilt: "sso.session.built",

  // ---------- Wave 7: billing & metering ----------
  BillingPlanCreated: "billing.plan.created",
  BillingSubscriptionCreated: "billing.subscription.created",
  BillingUsageRecorded: "billing.usage.recorded",
  BillingStatementIssued: "billing.statement.issued",

  // ---------- Wave 7: ERP / GL ----------
  ErpProfileCreated: "erp.profile.created",
  ErpExportDelivered: "erp.export.delivered",
  ErpAckReceived: "erp.ack.received",

  // ---------- Wave 7: contract lifecycle ----------
  ContractAgreementCreated: "contract.agreement.created",
  ContractAgreementApproved: "contract.agreement.approved",
  ContractAgreementSigned: "contract.agreement.signed",
  ContractAmendmentAdded: "contract.amendment.added",
  ContractObligationCreated: "contract.obligation.created",
  ContractObligationSatisfied: "contract.obligation.satisfied",

  // ---------- Wave 7: legal packets ----------
  LegalPacketCreated: "legal.packet.created",
  LegalPacketReady: "legal.packet.ready",
  LegalPacketDelivered: "legal.packet.delivered",

  // ---------- Wave 7: policy sandbox ----------
  PolicySimulationCompleted: "policy.simulation.completed",

  // ---------- Wave 7: federated analytics ----------
  FederatedPeerGroupCreated: "federated.peer_group.created",
  FederatedBenchmarkRun: "federated.benchmark.run",

  // ---------- Wave 7: SLA governance ----------
  SlaProfileCreated: "sla.profile.created",
  SlaBreachOpened: "sla.breach.opened",
  SlaBreachResolved: "sla.breach.resolved",

  // ---------- Wave 8: collections & dunning ----------
  CollectionsReceivableCreated: "collections.receivable.created",
  CollectionsReceivablePaid: "collections.receivable.paid",
  CollectionsDunningExecuted: "collections.dunning.executed",
  CollectionsWriteoffApproved: "collections.writeoff.approved",

  // ---------- Wave 8: e-signature ----------
  SignatureEnvelopeCreated: "signature.envelope.created",
  SignatureEnvelopeCompleted: "signature.envelope.completed",

  // ---------- Wave 8: revenue share ----------
  RevShareTreeActivated: "revshare.tree.activated",
  RevShareCalculationCompleted: "revshare.calculation.completed",

  // ---------- Wave 8: privacy governance ----------
  PrivacyPolicyCreated: "privacy.policy.created",
  PrivacyReleaseChecked: "privacy.release.checked",

  // ---------- Wave 8: data residency ----------
  ResidencyTenantAssigned: "residency.tenant.assigned",
  ResidencyActionDenied: "residency.action.denied",

  // ---------- Wave 8: legal systems connector ----------
  LegalMatterCreated: "legal.matter.created",
  LegalPacketExported: "legal.packet.exported",
  LegalHoldPlaced: "legal.hold.placed",

  // ---------- Wave 8: procurement automation ----------
  ProcurementResponseCreated: "procurement.response.created",
  ProcurementResponseSubmitted: "procurement.response.submitted",

  // ---------- Wave 9: sovereign deployment ----------
  SovereignTenantAssigned: "sovereign.tenant.assigned",
  SovereignExportBlocked: "sovereign.export.blocked",

  // ---------- Wave 9: tax localization ----------
  TaxDeterminationCompleted: "tax.determination.completed",

  // ---------- Wave 9: redlining + negotiation ----------
  RedlineVersionCreated: "redline.version.created",
  RedlineDiffComputed: "redline.diff.computed",
  RedlineIssueOpened: "redline.issue.opened",

  // ---------- Wave 9: revenue assurance ----------
  AssuranceAuditCompleted: "assurance.audit.completed",
  AssuranceVarianceCritical: "assurance.variance.critical",

  // ---------- Wave 9: privacy-enhancing compute ----------
  PrivacyComputeCompleted: "privacy.compute.completed",

  // ---------- Wave 9: regulatory filing ----------
  RegulatoryFilingStarted: "regulatory.filing.started",
  RegulatoryFilingFiled: "regulatory.filing.filed",

  // ---------- Wave 9: sales / diligence automation ----------
  SalesOpportunityCreated: "sales.opportunity.created",
  DiligenceWorkspaceOpened: "diligence.workspace.opened",
  DiligenceWorkspaceCompleted: "diligence.workspace.completed",

  // ---------- Wave 10: sovereign key custody ----------
  CustodyProfileCreated: "custody.profile.created",
  CustodyKeyRotated: "custody.key.rotated",
  CustodySigningDenied: "custody.signing.denied",
  CustodyAttestationIssued: "custody.attestation.issued",

  // ---------- Wave 10: tax filing + remittance ----------
  TaxObligationCreated: "tax.obligation.created",
  TaxObligationRemitted: "tax.obligation.remitted",
  TaxRemittanceQueued: "tax.remittance.queued",
  TaxRemittanceFailed: "tax.remittance.failed",

  // ---------- Wave 10: collaborative redlining ----------
  CollabRedlineWorkspaceOpened: "collab.redline.workspace.opened",
  CollabRedlineCheckpointPublished: "collab.redline.checkpoint.published",
  CollabRedlinePromoted: "collab.redline.promoted",

  // ---------- Wave 10: legal escalation ----------
  LegalEscalationCreated: "legal.escalation.created",

  // ---------- Wave 10: regulator notice orchestration ----------
  RegulatorNoticeCreated: "regulator.notice.created",
  RegulatorNoticeSubmitted: "regulator.notice.submitted",

  // ---------- Wave 10: enterprise planning ----------
  PlanningAccountCreated: "planning.account.created",
  PlanningForecastCompleted: "planning.forecast.completed",

  // ---------- Wave 11: sovereign attestation export ----------
  AttestationPacketAssembled: "attestation.packet.assembled",
  AttestationExportApproved: "attestation.export.approved",

  // ---------- Wave 11: remittance rails ----------
  RailSubmissionSubmitted: "rail.submission.submitted",
  RailSubmissionAcknowledged: "rail.submission.acknowledged",
  RailSubmissionFailed: "rail.submission.failed",

  // ---------- Wave 11: realtime collaboration ----------
  CollabSessionStarted: "collab.session.started",
  CollabCheckpointPublished: "collab.checkpoint.published",

  // ---------- Wave 11: regulator portal connector ----------
  RegulatorPortalSubmitted: "regulator.portal.submitted",
  RegulatorPortalResponseIngested: "regulator.portal.response.ingested",

  // ---------- Wave 11: driver forecast model ----------
  ForecastDriverRun: "forecast.driver.run",

  // ---------- Wave 11: CRM/RevOps sync ----------
  CrmAccountSynced: "crm.account.synced",
  CrmOpportunitySynced: "crm.opportunity.synced",
  CrmForecastReconciled: "crm.forecast.reconciled",

  // ---------- Wave 11: sovereignty incident orchestration ----------
  IncidentClassified: "incident.classified",
  IncidentRunbookActionCompleted: "incident.runbook.action.completed",
  IncidentResolved: "incident.resolved"
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
