import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerPolicyRoutes } from "./routes/policy";

export async function buildPolicyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "policy-compliance-service" }));
  registerPolicyRoutes(app);
  return app;
}
