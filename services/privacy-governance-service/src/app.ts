import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerPrivacyRoutes } from "./routes/privacy";

export async function buildPrivacyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "privacy-governance-service" }));
  registerPrivacyRoutes(app);
  return app;
}
