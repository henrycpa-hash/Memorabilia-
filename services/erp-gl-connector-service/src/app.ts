import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerErpRoutes } from "./routes/erp";

export async function buildErpApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "erp-gl-connector-service" }));
  registerErpRoutes(app);
  return app;
}
