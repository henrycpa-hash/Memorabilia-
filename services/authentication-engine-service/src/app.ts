import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerAuthEngineRoutes } from "./routes/auth";

export async function buildAuthEngineApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "authentication-engine-service" }));
  registerAuthEngineRoutes(app);
  hardenFastify(app, "authentication-engine-service");
  return app;
}
