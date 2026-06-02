import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerTrainingRoutes } from "./routes/training";

export async function buildTrainingApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "model-training-service" }));
  registerTrainingRoutes(app);
  return app;
}
