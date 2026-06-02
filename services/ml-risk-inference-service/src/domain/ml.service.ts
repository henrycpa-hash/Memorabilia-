import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { inferRisk, type FeatureVector, type InferenceResult } from "@crownx-jewel/shared-ml";
import { mlRepo, type FeatureSnapshot, type InferenceLog, type ModelRegistryEntry } from "../repo/ml.repo";

export const mlService = {
  /** Persist a feature vector for a subject. Wave 6 will compute these from real warehouse data. */
  ingestFeatures(input: {
    subjectType: string;
    subjectId: string;
    featureVector: FeatureVector;
  }): FeatureSnapshot {
    const f: FeatureSnapshot = {
      id: newId(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      featureVector: input.featureVector,
      createdAt: nowIso()
    };
    mlRepo.insertFeatures(f);
    return f;
  },

  registerModel(input: {
    modelName: string;
    modelVersion: string;
    modelType: string;
    status: "champion" | "challenger" | "retired";
    thresholdConfigJson?: Record<string, number>;
  }): ModelRegistryEntry {
    const m: ModelRegistryEntry = {
      id: newId(),
      modelName: input.modelName,
      modelVersion: input.modelVersion,
      modelType: input.modelType,
      status: input.status,
      thresholdConfigJson: input.thresholdConfigJson || { review: 0.45, hold: 0.75 },
      createdAt: nowIso()
    };
    mlRepo.insertModel(m);
    return m;
  },

  /**
   * Run inference using the champion model and (optionally) the challenger.
   * Logs both results plus a divergence flag for offline analysis.
   */
  async infer(input: {
    subjectType: string;
    subjectId: string;
    featureVector: FeatureVector;
  }): Promise<{ champion: InferenceResult; challenger: InferenceResult | null; divergence: boolean }> {
    // Persist the snapshot first so we have a feature trail.
    mlService.ingestFeatures(input);

    const championModel = mlRepo.champion();
    const challengerModel = mlRepo.challenger();

    const championResult = inferRisk({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      featureVector: input.featureVector,
      modelName: championModel?.modelName || "fraud-risk-linear",
      modelVersion: championModel?.modelVersion || "v1"
    });

    let challengerResult: InferenceResult | null = null;
    if (challengerModel) {
      // Wave 5 challenger uses the same scorer with a slightly different name —
      // Wave 6 swaps in a real second model loaded from artifact storage.
      challengerResult = inferRisk({
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        featureVector: input.featureVector,
        modelName: challengerModel.modelName,
        modelVersion: challengerModel.modelVersion
      });
    }

    const divergence =
      challengerResult != null && challengerResult.decision !== championResult.decision;

    const log: InferenceLog = {
      id: newId(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      modelName: championResult.modelName,
      modelVersion: championResult.modelVersion,
      championScore: championResult.score,
      championDecision: championResult.decision,
      challengerScore: challengerResult?.score ?? null,
      challengerDecision: challengerResult?.decision ?? null,
      divergence,
      explanationJson: championResult.explanationJson as unknown as Record<string, unknown>,
      realizedOutcome: null,
      createdAt: nowIso()
    };
    mlRepo.insertLog(log);

    await publishOutbox({
      id: newId(),
      eventType: "ml.inference.scored",
      aggregateId: log.id,
      aggregateType: "inference_log",
      payload: log,
      occurredAt: nowIso()
    });

    return { champion: championResult, challenger: challengerResult, divergence };
  },

  recordOutcome: (id: string, realizedOutcome: string) => mlRepo.recordOutcome(id, realizedOutcome),
  listLogs: () => mlRepo.listLogs(),
  logsForSubject: (subjectType: string, subjectId: string) =>
    mlRepo.logsForSubject(subjectType, subjectId),
  listModels: () => mlRepo.listModels(),
  champion: () => mlRepo.champion(),
  challenger: () => mlRepo.challenger(),
  promoteChampion: (id: string) => mlRepo.promoteChampion(id),
  latestFeatures: (subjectType: string, subjectId: string) =>
    mlRepo.latestFeatures(subjectType, subjectId)
};
