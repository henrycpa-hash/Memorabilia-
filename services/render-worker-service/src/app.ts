import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRenderRoutes } from "./routes/render";

export async function buildRenderApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "render-worker-service" }));
  registerRenderRoutes(app);
  return app;
}
