import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerWarehouseRoutes } from "./routes/warehouse";

export async function buildWarehouseApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "analytics-warehouse-service" }));
  registerWarehouseRoutes(app);
  return app;
}
