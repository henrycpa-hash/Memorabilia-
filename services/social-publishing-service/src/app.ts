import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSocialRoutes } from "./routes/social";

export async function buildSocialApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "social-publishing-service" }));
  registerSocialRoutes(app);
  return app;
}
