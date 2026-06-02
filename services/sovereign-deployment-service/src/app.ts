import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSovereignRoutes } from "./routes/sovereign";

export async function buildSovereignApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sovereign-deployment-service" }));
  registerSovereignRoutes(app);
  return app;
}
