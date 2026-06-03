import { buildFeedApp } from "./app";

async function main() {
  const app = await buildFeedApp();
  const port = Number(process.env.NETWORK_FEED_SERVICE_PORT || 4079);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`network-feed-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
