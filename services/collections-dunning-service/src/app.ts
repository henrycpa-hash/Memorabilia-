import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCollectionsRoutes } from "./routes/collections";

export async function buildCollectionsApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "collections-dunning-service" }));
  registerCollectionsRoutes(app);
  return app;
}
