import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSandboxRoutes } from "./routes/sandbox";

export async function buildSandboxApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "policy-sandbox-service" }));
  registerSandboxRoutes(app);
  return app;
}
