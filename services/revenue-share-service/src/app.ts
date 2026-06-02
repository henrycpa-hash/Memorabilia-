import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRevShareRoutes } from "./routes/revshare";

export async function buildRevShareApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "revenue-share-service" }));
  registerRevShareRoutes(app);
  return app;
}
