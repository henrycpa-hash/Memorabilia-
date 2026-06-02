import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCheckoutRoutes } from "./routes/checkout";

export async function buildMarketplaceApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "marketplace-service" }));
  registerCheckoutRoutes(app);
  return app;
}
