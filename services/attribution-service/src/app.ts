import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerAttributionRoutes } from "./routes/attribution";

export async function buildAttributionApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "attribution-service" }));
  registerAttributionRoutes(app);
  hardenFastify(app, "attribution-service");
  return app;
}
