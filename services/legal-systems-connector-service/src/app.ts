import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerLegalConnectorRoutes } from "./routes/legal-connector";

export async function buildLegalConnectorApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "legal-systems-connector-service" }));
  registerLegalConnectorRoutes(app);
  return app;
}
