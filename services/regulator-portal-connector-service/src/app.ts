import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerPortalConnectorRoutes } from "./routes/portal-connector";

export async function buildPortalConnectorApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "regulator-portal-connector-service" }));
  registerPortalConnectorRoutes(app);
  return app;
}
