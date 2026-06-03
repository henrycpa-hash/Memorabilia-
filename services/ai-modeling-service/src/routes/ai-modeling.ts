import type { FastifyInstance } from "fastify";
import { posInt } from "@crownx-jewel/shared-kernel";
import { aiModeling } from "../domain/ai-modeling.service";

export function registerAiModelingRoutes(app: FastifyInstance) {
  // ---- sovereignty data consent ----
  app.get("/ai-modeling/consent/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return aiModeling.getConsent(userId);
  });
  app.post("/ai-modeling/consent/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const b = (request.body || {}) as { aiModeling?: boolean; scopes?: string[] };
    if (typeof b.aiModeling !== "boolean") return reply.code(400).send({ error: "aiModeling_boolean_required" });
    return aiModeling.setConsent(userId, b.aiModeling, b.scopes);
  });

  // ---- mint a data-contribution token at a consented COA authentication ----
  app.post("/ai-modeling/contribute", async (request, reply) => {
    const b = (request.body || {}) as { holderId?: string; assetId?: string; coaId?: string; modalities?: string[]; confidence?: number; anomalyScore?: number; commonness?: number; novel?: boolean; assetClass?: string };
    if (!b.holderId || !b.assetId || !Array.isArray(b.modalities) || typeof b.confidence !== "number") {
      return reply.code(400).send({ error: "holderId_assetId_modalities_confidence_required" });
    }
    return aiModeling.mintContributionToken({
      holderId: b.holderId, assetId: b.assetId, coaId: b.coaId,
      modalities: b.modalities, confidence: b.confidence, anomalyScore: b.anomalyScore,
      commonness: b.commonness, novel: b.novel, assetClass: b.assetClass
    });
  });

  // ---- model improvement updates (hash the contributing tokens) ----
  app.post("/ai-modeling/model-update", async (request, reply) => {
    const b = (request.body || {}) as { version?: string; note?: string; tokenIds?: string[] };
    if (!b.version) return reply.code(400).send({ error: "version_required" });
    return aiModeling.recordModelUpdate({ version: b.version, note: b.note || "", tokenIds: b.tokenIds });
  });
  app.post("/ai-modeling/model-update/:updateId/deploy", async (request, reply) => {
    const { updateId } = request.params as { updateId: string };
    const r = aiModeling.deployModelUpdate(updateId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.get("/ai-modeling/model-updates", async () => ({ updates: aiModeling.modelUpdates() }));

  // ---- revenue (the cash-flow the pool is tied to) ----
  app.post("/ai-modeling/revenue", async (request, reply) => {
    const b = (request.body || {}) as { source?: string; cents?: number };
    const cents = posInt(b.cents);
    if (!b.source || cents === null) return reply.code(400).send({ error: "source_and_positive_cents_required" });
    return aiModeling.recordRevenue({ source: b.source, cents });
  });

  // ---- compensation epochs (allocate before dividends, distribute pro-rata) ----
  app.post("/ai-modeling/epoch", async (request) => {
    const b = (request.body || {}) as { attributableProfitCents?: number; boardAllocBps?: number };
    return aiModeling.openEpoch({ attributableProfitCents: b.attributableProfitCents, boardAllocBps: b.boardAllocBps });
  });
  app.post("/ai-modeling/epoch/:epochId/distribute", async (request, reply) => {
    const { epochId } = request.params as { epochId: string };
    const r = aiModeling.distributeEpoch(epochId);
    if ("error" in r) return reply.code(r.error === "epoch_not_found" ? 404 : 409).send(r);
    return r;
  });
  app.get("/ai-modeling/epochs", async () => ({ epochs: aiModeling.epochs() }));

  // ---- views ----
  app.get("/ai-modeling/pool", async () => aiModeling.poolStatus());
  app.get("/ai-modeling/user/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return aiModeling.userDashboard(userId);
  });
}
