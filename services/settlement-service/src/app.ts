import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSettlementRoutes } from "./routes/settlements";

export async function buildSettlementApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "settlement-service" }));
  registerSettlementRoutes(app);
  return app;
}
