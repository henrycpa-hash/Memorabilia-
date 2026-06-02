import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCampaignRoutes } from "./routes/campaigns";

export async function buildCampaignApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "campaign-service" }));
  registerCampaignRoutes(app);
  return app;
}
