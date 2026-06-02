import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerFinanceExportRoutes } from "./routes/finance";

export async function buildFinanceApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "finance-export-service" }));
  registerFinanceExportRoutes(app);
  return app;
}
