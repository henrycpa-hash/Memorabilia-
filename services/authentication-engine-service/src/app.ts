import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthEngineRoutes } from "./routes/auth";

export async function buildAuthEngineApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "authentication-engine-service" }));
  registerAuthEngineRoutes(app);
  return app;
}
