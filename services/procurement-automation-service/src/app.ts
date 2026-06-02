import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerProcurementRoutes } from "./routes/procurement";

export async function buildProcurementApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "procurement-automation-service" }));
  registerProcurementRoutes(app);
  return app;
}
