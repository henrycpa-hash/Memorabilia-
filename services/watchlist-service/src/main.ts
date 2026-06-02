import { buildWatchlistApp } from "./app";

async function main() {
  const app = await buildWatchlistApp();
  await app.listen({ host: "0.0.0.0", port: 4011 });
  // eslint-disable-next-line no-console
  console.log("watchlist-service listening on 4011");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
