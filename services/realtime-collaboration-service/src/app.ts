import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRealtimeCollabRoutes } from "./routes/realtime-collab";

export async function buildRealtimeCollabApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "realtime-collaboration-service" }));
  registerRealtimeCollabRoutes(app);
  return app;
}
