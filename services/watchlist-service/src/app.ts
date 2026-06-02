import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerWatchlistRoutes } from "./routes/watchlists";

export async function buildWatchlistApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "watchlist-service" }));
  registerWatchlistRoutes(app);
  return app;
}
