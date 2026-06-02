import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerExpRoutes } from "./routes/experiments";

export async function buildExpApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "experimentation-service" }));
  registerExpRoutes(app);
  return app;
}
