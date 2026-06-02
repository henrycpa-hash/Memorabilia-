import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerFedAnalyticsRoutes } from "./routes/federated";

export async function buildFederatedApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "federated-analytics-service" }));
  registerFedAnalyticsRoutes(app);
  return app;
}
