import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  scoreRisk,
  computeUserReputation,
  computeCreatorMomentum,
  reputationTier,
  type RiskBand
} from "@crownx-jewel/shared-risk";
import { fraudRepo, type FraudScore, type FraudAlert } from "../repo/fraud.repo";

export const fraudService = {
  async evaluate(input: {
    subjectType: "user" | "settlement" | "auction" | "offer";
    subjectId: string;
    signals: string[];
  }): Promise<FraudScore> {
    const r = scoreRisk(input.signals);
    const row: FraudScore = {
      id: newId(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      score: r.score,
      riskBand: r.riskBand,
      reasons: r.reasons,
      createdAt: nowIso()
    };
    fraudRepo.insertScore(row);

    // Auto-raise an alert when band is high or critical.
    if (r.riskBand === "high" || r.riskBand === "critical") {
      const alert: FraudAlert = {
        id: newId(),
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        alertType: `risk_${r.riskBand}`,
        severity: r.riskBand === "critical" ? "critical" : "warning",
        status: "open",
        reason: r.reasons.join(","),
        createdAt: nowIso()
      };
      fraudRepo.insertAlert(alert);

      await publishOutbox({
        id: newId(),
        eventType: "fraud.alert.raised",
        aggregateId: alert.id,
        aggregateType: "fraud_alert",
        payload: alert,
        occurredAt: nowIso()
      });
    }

    await publishOutbox({
      id: newId(),
      eventType: "fraud.score.evaluated",
      aggregateId: row.id,
      aggregateType: "fraud_score",
      payload: row,
      occurredAt: nowIso()
    });

    return row;
  },

  listScores() {
    return fraudRepo.listScores();
  },
  scoresFor(subjectType: string, subjectId: string) {
    return fraudRepo.scoresFor(subjectType, subjectId);
  },
  latestScore(subjectType: string, subjectId: string) {
    return fraudRepo.latestScore(subjectType, subjectId);
  },

  listAlerts() {
    return fraudRepo.listAlerts();
  },
  acknowledgeAlert(id: string) {
    return fraudRepo.updateAlertStatus(id, "acknowledged");
  },
  dismissAlert(id: string) {
    return fraudRepo.updateAlertStatus(id, "dismissed");
  }
};

export const reputationService = {
  recomputeUser(input: {
    userId: string;
    successfulTrades: number;
    disputeRate: number;
    fraudFlags: number;
    watchFollowers: number;
  }) {
    const score = computeUserReputation(input);
    const tier = reputationTier(score);
    const row = {
      userId: input.userId,
      score,
      tier,
      successfulTrades: input.successfulTrades,
      disputeRate: input.disputeRate,
      fraudFlags: input.fraudFlags,
      watchFollowers: input.watchFollowers,
      updatedAt: nowIso()
    };
    fraudRepo.upsertUserReputation(row);
    return row;
  },

  recomputeCreator(input: {
    creatorId: string;
    authenticatedAssetCount: number;
    resaleVelocity: number;
    campaignConversionRate: number;
    referralConversionRate: number;
  }) {
    const momentum = computeCreatorMomentum(input);
    const row = {
      creatorId: input.creatorId,
      momentum,
      authenticatedAssetCount: input.authenticatedAssetCount,
      resaleVelocity: input.resaleVelocity,
      campaignConversionRate: input.campaignConversionRate,
      referralConversionRate: input.referralConversionRate,
      updatedAt: nowIso()
    };
    fraudRepo.upsertCreatorReputation(row);
    return row;
  },

  findUser(userId: string) {
    return fraudRepo.findUserReputation(userId);
  },
  findCreator(creatorId: string) {
    return fraudRepo.findCreatorReputation(creatorId);
  },
  listUsers() {
    return fraudRepo.listUserReputations();
  },
  listCreators() {
    return fraudRepo.listCreatorReputations();
  }
};

export type { RiskBand };
