import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerConnectorRoutes } from "./routes/connectors";

export async function buildConnectorApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "connector-runtime-service" }));
  registerConnectorRoutes(app);
  return app;
}
