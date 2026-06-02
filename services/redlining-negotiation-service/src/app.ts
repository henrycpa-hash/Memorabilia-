import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRedliningRoutes } from "./routes/redlining";

export async function buildRedliningApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "redlining-negotiation-service" }));
  registerRedliningRoutes(app);
  return app;
}
