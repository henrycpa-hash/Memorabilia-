import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSalesRoutes } from "./routes/sales";

export async function buildSalesApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sales-diligence-automation-service" }));
  registerSalesRoutes(app);
  return app;
}
