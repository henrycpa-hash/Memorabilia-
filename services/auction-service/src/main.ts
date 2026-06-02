import { buildAuctionApp } from "./app";

async function main() {
  const app = await buildAuctionApp();
  await app.listen({ host: "0.0.0.0", port: 4009 });
  // eslint-disable-next-line no-console
  console.log("auction-service listening on 4009");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
