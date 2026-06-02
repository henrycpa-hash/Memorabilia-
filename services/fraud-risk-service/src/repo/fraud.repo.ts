import type { RiskBand } from "@crownx-jewel/shared-risk";

export type FraudScore = {
  id: string;
  subjectType: "user" | "settlement" | "auction" | "offer";
  subjectId: string;
  score: number;
  riskBand: RiskBand;
  reasons: string[];
  createdAt: string;
};

export type FraudAlert = {
  id: string;
  subjectType: string;
  subjectId: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "dismissed";
  reason: string;
  createdAt: string;
};

export type UserReputation = {
  userId: string;
  score: number;
  tier: string;
  successfulTrades: number;
  disputeRate: number;
  fraudFlags: number;
  watchFollowers: number;
  updatedAt: string;
};

export type CreatorReputation = {
  creatorId: string;
  momentum: number;
  authenticatedAssetCount: number;
  resaleVelocity: number;
  campaignConversionRate: number;
  referralConversionRate: number;
  updatedAt: string;
};

const scores: FraudScore[] = [];
const alerts: FraudAlert[] = [];
const userRep = new Map<string, UserReputation>();
const creatorRep = new Map<string, CreatorReputation>();

export const fraudRepo = {
  insertScore(s: FraudScore) {
    scores.push(s);
    return s;
  },
  listScores() {
    return [...scores].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  scoresFor(subjectType: string, subjectId: string) {
    return scores.filter(
      (s) => s.subjectType === subjectType && s.subjectId === subjectId
    );
  },
  latestScore(subjectType: string, subjectId: string) {
    const list = this.scoresFor(subjectType, subjectId);
    return list[list.length - 1] || null;
  },

  insertAlert(a: FraudAlert) {
    alerts.push(a);
    return a;
  },
  listAlerts() {
    return [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  updateAlertStatus(id: string, status: FraudAlert["status"]) {
    const a = alerts.find((x) => x.id === id);
    if (a) a.status = status;
    return a || null;
  },

  upsertUserReputation(r: UserReputation) {
    userRep.set(r.userId, r);
    return r;
  },
  findUserReputation(userId: string) {
    return userRep.get(userId) || null;
  },
  upsertCreatorReputation(r: CreatorReputation) {
    creatorRep.set(r.creatorId, r);
    return r;
  },
  findCreatorReputation(creatorId: string) {
    return creatorRep.get(creatorId) || null;
  },
  listUserReputations() {
    return Array.from(userRep.values());
  },
  listCreatorReputations() {
    return Array.from(creatorRep.values());
  }
};
