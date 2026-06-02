import { buildMarketplaceApp } from "./app";

async function main() {
  const app = await buildMarketplaceApp();
  await app.listen({ host: "0.0.0.0", port: 4005 });
  // eslint-disable-next-line no-console
  console.log("marketplace-service listening on 4005");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
