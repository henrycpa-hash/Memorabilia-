import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerTrendingRoutes } from "./routes/trending";
import { registerShareCardRoutes } from "./routes/share-cards";

export async function buildRankingApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "growth-ranking-service" }));
  registerTrendingRoutes(app);
  registerShareCardRoutes(app);
  return app;
}
