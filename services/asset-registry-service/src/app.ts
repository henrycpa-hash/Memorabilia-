import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAssetRoutes } from "./routes/assets";
import { registerEvidenceRoutes } from "./routes/evidence";
import { registerListingRoutes } from "./routes/listings";

export async function buildAssetApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "asset-registry-service" }));
  registerAssetRoutes(app);
  registerEvidenceRoutes(app);
  registerListingRoutes(app);
  return app;
}
