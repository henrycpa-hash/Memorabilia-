import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { FactEventTypes, type MarketFact, type FactEventType } from "@crownx-jewel/shared-analytics";
import { warehouseRepo } from "../repo/warehouse.repo";

export const warehouseService = {
  async insertFact(input: {
    eventType: FactEventType;
    assetId: string;
    creatorId?: string | null;
    amount?: number | null;
    userId?: string | null;
    sourceId: string;
  }): Promise<MarketFact> {
    const f: MarketFact = {
      id: newId(),
      eventDate: nowIso(),
      eventType: input.eventType,
      assetId: input.assetId,
      creatorId: input.creatorId ?? null,
      amount: input.amount != null ? input.amount.toFixed(2) : null,
      userId: input.userId ?? null,
      sourceId: input.sourceId,
      createdAt: nowIso()
    };
    warehouseRepo.insertFact(f);

    await publishOutbox({
      id: newId(),
      eventType: "warehouse.fact.inserted",
      aggregateId: f.id,
      aggregateType: "market_fact",
      payload: f,
      occurredAt: nowIso()
    });

    return f;
  },

  list() {
    return warehouseRepo.list();
  },
  listByType(type: string) {
    return warehouseRepo.listByType(type);
  },

  /**
   * Wave 4 derives KPIs by scanning facts in-memory. Wave 5 swaps to
   * pre-aggregated rollup tables.
   */
  kpis() {
    const gmv = warehouseRepo.sumAmountByType(FactEventTypes.SaleCompleted);
    const totalFacts = warehouseRepo.count();
    const sales = warehouseRepo.countByType(FactEventTypes.SaleCompleted);
    const auctionClosures = warehouseRepo.countByType(FactEventTypes.AuctionClosed);
    const disputes = warehouseRepo.countByType(FactEventTypes.DisputeOpened);
    const settlementHolds = warehouseRepo.countByType(FactEventTypes.SettlementHeld);
    const fraudFlags = warehouseRepo.countByType(FactEventTypes.FraudFlagRaised);
    const renderRolls = warehouseRepo.countByType(FactEventTypes.ShareCardRendered);
    const campaignLaunched = warehouseRepo.countByType(FactEventTypes.CampaignLaunched);
    const campaignClicked = warehouseRepo.countByType(FactEventTypes.CampaignClicked);
    const campaignConverted = warehouseRepo.countByType(FactEventTypes.CampaignConverted);

    return {
      market: {
        gmv: gmv.toFixed(2),
        sales,
        auctionClosures,
        auctionCloseSuccessRate: auctionClosures
          ? Math.min(1, sales / auctionClosures)
          : 0
      },
      growth: {
        renderRolls,
        campaignLaunched,
        campaignClicked,
        campaignConverted,
        campaignCtr: campaignLaunched ? campaignClicked / campaignLaunched : 0
      },
      trust: {
        disputes,
        settlementHolds,
        fraudFlags,
        disputeRate: sales ? disputes / sales : 0,
        settlementHoldRate: sales ? settlementHolds / sales : 0
      },
      totals: {
        facts: totalFacts
      }
    };
  }
};
