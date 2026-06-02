import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerNotificationRoutes } from "./routes/notifications";

export async function buildNotificationApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "notification-service" }));
  registerNotificationRoutes(app);
  return app;
}
