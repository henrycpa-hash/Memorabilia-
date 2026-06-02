import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerDriverForecastRoutes } from "./routes/driver-forecast";

export async function buildDriverForecastApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "driver-forecast-model-service" }));
  registerDriverForecastRoutes(app);
  return app;
}
