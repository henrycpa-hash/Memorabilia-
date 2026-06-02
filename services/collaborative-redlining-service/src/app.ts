import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCollabRedliningRoutes } from "./routes/collab-redlining";

export async function buildCollabRedliningApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "collaborative-redlining-service" }));
  registerCollabRedliningRoutes(app);
  return app;
}
