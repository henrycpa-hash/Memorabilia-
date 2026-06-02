import type { FeatureVector, RiskDecision } from "@crownx-jewel/shared-ml";

export type FeatureSnapshot = {
  id: string;
  subjectType: string;
  subjectId: string;
  featureVector: FeatureVector;
  createdAt: string;
};

export type ModelRegistryEntry = {
  id: string;
  modelName: string;
  modelVersion: string;
  modelType: string;
  status: "champion" | "challenger" | "retired";
  thresholdConfigJson: Record<string, number>;
  createdAt: string;
};

export type InferenceLog = {
  id: string;
  subjectType: string;
  subjectId: string;
  modelName: string;
  modelVersion: string;
  championScore: number;
  championDecision: RiskDecision;
  challengerScore: number | null;
  challengerDecision: RiskDecision | null;
  divergence: boolean;
  explanationJson: Record<string, unknown>;
  realizedOutcome: string | null;
  createdAt: string;
};

const features: FeatureSnapshot[] = [];
const models: ModelRegistryEntry[] = [];
const logs: InferenceLog[] = [];

export const mlRepo = {
  insertFeatures(f: FeatureSnapshot) { features.push(f); return f; },
  latestFeatures(subjectType: string, subjectId: string) {
    const list = features.filter((f) => f.subjectType === subjectType && f.subjectId === subjectId);
    return list[list.length - 1] || null;
  },
  listFeatures() { return [...features].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },

  insertModel(m: ModelRegistryEntry) { models.push(m); return m; },
  champion(): ModelRegistryEntry | null {
    return models.find((m) => m.status === "champion") || null;
  },
  challenger(): ModelRegistryEntry | null {
    return models.find((m) => m.status === "challenger") || null;
  },
  listModels() { return [...models]; },
  promoteChampion(id: string) {
    for (const m of models) {
      if (m.id === id) m.status = "champion";
      else if (m.status === "champion") m.status = "retired";
    }
    return models.find((m) => m.id === id) || null;
  },

  insertLog(l: InferenceLog) { logs.push(l); return l; },
  listLogs() { return [...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  logsForSubject(subjectType: string, subjectId: string) {
    return logs.filter((l) => l.subjectType === subjectType && l.subjectId === subjectId);
  },
  recordOutcome(id: string, realizedOutcome: string) {
    const l = logs.find((x) => x.id === id);
    if (l) l.realizedOutcome = realizedOutcome;
    return l || null;
  }
};
