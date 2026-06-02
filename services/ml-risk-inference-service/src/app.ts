import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerMlRoutes } from "./routes/ml";
import { mlService } from "./domain/ml.service";

export async function buildMlApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "ml-risk-inference-service" }));
  registerMlRoutes(app);

  // Seed a default champion + challenger so /ml/inference works out of the box.
  if (!mlService.champion()) {
    mlService.registerModel({
      modelName: "fraud-risk-linear",
      modelVersion: "v1",
      modelType: "fraud_risk",
      status: "champion"
    });
  }
  if (!mlService.challenger()) {
    mlService.registerModel({
      modelName: "fraud-risk-linear",
      modelVersion: "v2-shadow",
      modelType: "fraud_risk",
      status: "challenger"
    });
  }

  return app;
}
