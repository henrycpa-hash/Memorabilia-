import type { FastifyInstance } from "fastify";
import { TRAINING_SOURCES, type SensorReadings, type PriceSources } from "@crownx-jewel/shared-authcore";
import { authEngine } from "../domain/auth-engine.service";

export function registerAuthEngineRoutes(app: FastifyInstance) {
  // the reference data sources the AI pulls from (PSA / Beckett / JSA / WorthPoint / eBay)
  app.get("/auth/training-sources", async () => ({ sources: TRAINING_SOURCES }));

  // Step 0 — open a sealed capture session
  app.post("/auth/session", async (request) => {
    const b = (request.body || {}) as { deviceClass?: string };
    return authEngine.openSession(b.deviceClass);
  });

  // weighted dynamic memorabilia value from the reference sources
  app.post("/auth/price", async (request, reply) => {
    const b = (request.body || {}) as { sources?: PriceSources; authConfidence?: number };
    if (!b.sources) return reply.code(400).send({ error: "sources_required" });
    return authEngine.price(b.sources, b.authConfidence);
  });

  // the full live-capture → authenticate → mint pipeline (climbs /LV99 on success)
  app.post("/auth/mint", async (request, reply) => {
    const b = (request.body || {}) as {
      userId?: string;
      title?: string;
      assetType?: string;
      sensors?: SensorReadings;
      priceSources?: PriceSources;
      hasPriorCoa?: boolean;
      sessionId?: string;
    };
    if (!b.userId || !b.title || !b.sensors) return reply.code(400).send({ error: "userId_title_sensors_required" });
    return authEngine.authenticateAndMint({
      userId: b.userId,
      title: b.title,
      assetType: b.assetType,
      sensors: b.sensors,
      priceSources: b.priceSources,
      hasPriorCoa: b.hasPriorCoa,
      sessionId: b.sessionId
    });
  });

  app.get("/auth/coas/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return authEngine.coasFor(userId);
  });
}
