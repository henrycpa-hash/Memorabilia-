import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerMetricsRoutes } from "./routes/metrics";

export async function buildMetricsApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "semantic-metrics-service" }));
  registerMetricsRoutes(app);
  return app;
}
