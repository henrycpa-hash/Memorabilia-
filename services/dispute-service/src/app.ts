import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerDisputeRoutes } from "./routes/disputes";

export async function buildDisputeApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "dispute-service" }));
  registerDisputeRoutes(app);
  return app;
}
