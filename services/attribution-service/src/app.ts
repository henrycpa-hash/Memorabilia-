import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAttributionRoutes } from "./routes/attribution";

export async function buildAttributionApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "attribution-service" }));
  registerAttributionRoutes(app);
  return app;
}
