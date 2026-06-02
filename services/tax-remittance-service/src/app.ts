import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerTaxRemittanceRoutes } from "./routes/tax-remittance";

export async function buildTaxRemittanceApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "tax-remittance-service" }));
  registerTaxRemittanceRoutes(app);
  return app;
}
