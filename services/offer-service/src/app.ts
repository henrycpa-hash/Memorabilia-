import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerOfferRoutes } from "./routes/offers";

export async function buildOfferApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "offer-service" }));
  registerOfferRoutes(app);
  return app;
}
