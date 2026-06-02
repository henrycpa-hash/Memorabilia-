import { newId, nowIso, round2 } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type {
  RoyaltyRule,
  RoyaltyDistribution,
  RoyaltyBeneficiary
} from "@crownx-jewel/contracts";
import { royaltyRuleRepo } from "../repo/royalty-rule.repo";
import { royaltyDistributionRepo } from "../repo/royalty-distribution.repo";

export const royaltyService = {
  async createRule(input: {
    assetId: string;
    beneficiaries: RoyaltyBeneficiary[];
  }): Promise<RoyaltyRule> {
    const rule: RoyaltyRule = {
      id: newId(),
      assetId: input.assetId,
      beneficiaries: input.beneficiaries,
      active: true,
      createdAt: nowIso()
    };
    royaltyRuleRepo.insert(rule);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.RoyaltyRuleCreated,
      aggregateId: rule.id,
      aggregateType: "royalty_rule",
      payload: rule,
      occurredAt: nowIso()
    });

    return rule;
  },

  listRules() {
    return royaltyRuleRepo.list();
  },

  getRuleByAssetId(assetId: string) {
    return royaltyRuleRepo.findByAssetId(assetId);
  },

  async calculateForSale(orderId: string, assetId: string, saleAmount: number) {
    const rule = royaltyRuleRepo.findByAssetId(assetId);
    if (!rule) {
      return { totalRoyalty: 0, distributions: [] as RoyaltyDistribution[] };
    }

    const distributions: RoyaltyDistribution[] = rule.beneficiaries.map((b) => ({
      id: newId(),
      orderId,
      beneficiaryId: b.beneficiaryId,
      amount: round2(saleAmount * (b.percentage / 100)),
      createdAt: nowIso()
    }));

    for (const d of distributions) {
      royaltyDistributionRepo.insert(d);
      await publishOutbox({
        id: newId(),
        eventType: EventTypes.RoyaltyDistributionPosted,
        aggregateId: d.id,
        aggregateType: "royalty_distribution",
        payload: d,
        occurredAt: nowIso()
      });
    }

    return {
      totalRoyalty: round2(distributions.reduce((sum, d) => sum + d.amount, 0)),
      distributions
    };
  },

  listDistributions() {
    return royaltyDistributionRepo.list();
  }
};
