import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSsoRoutes } from "./routes/sso";

export async function buildSsoApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sso-federation-service" }));
  registerSsoRoutes(app);
  return app;
}
