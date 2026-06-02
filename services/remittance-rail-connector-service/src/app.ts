import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRailConnectorRoutes } from "./routes/rail-connector";

export async function buildRailConnectorApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "remittance-rail-connector-service" }));
  registerRailConnectorRoutes(app);
  return app;
}
