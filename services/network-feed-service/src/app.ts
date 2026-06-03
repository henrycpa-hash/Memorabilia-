import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerFeedRoutes } from "./routes/feed";

export async function buildFeedApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "network-feed-service" }));
  registerFeedRoutes(app);
  return app;
}
