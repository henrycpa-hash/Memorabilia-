import { buildAttributionApp } from "./app";

async function main() {
  const app = await buildAttributionApp();
  const port = Number(process.env.ATTRIBUTION_SERVICE_PORT || 4074);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`attribution-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
