import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuctionRoutes } from "./routes/auctions";

export async function buildAuctionApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "auction-service" }));
  registerAuctionRoutes(app);
  return app;
}
