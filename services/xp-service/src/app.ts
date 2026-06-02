import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerXpRoutes } from "./routes/xp";

export async function buildXpApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "xp-service" }));
  registerXpRoutes(app);
  return app;
}
