import { buildAssetApp } from "./app";

async function main() {
  const app = await buildAssetApp();
  await app.listen({ host: "0.0.0.0", port: 4002 });
  // eslint-disable-next-line no-console
  console.log("asset-registry-service listening on 4002");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
