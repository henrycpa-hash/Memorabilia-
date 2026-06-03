import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerAiModelingRoutes } from "./routes/ai-modeling";

export async function buildAiModelingApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "ai-modeling-service" }));
  registerAiModelingRoutes(app);
  hardenFastify(app, "ai-modeling-service");
  return app;
}
