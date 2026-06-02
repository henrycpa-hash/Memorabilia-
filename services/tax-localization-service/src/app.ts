import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerTaxRoutes } from "./routes/tax";

export async function buildTaxApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "tax-localization-service" }));
  registerTaxRoutes(app);
  return app;
}
