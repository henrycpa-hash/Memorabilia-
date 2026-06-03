import { buildPackNShipApp } from "./app";

async function main() {
  const app = await buildPackNShipApp();
  const port = Number(process.env.PACK_N_SHIP_SERVICE_PORT || 4077);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`pack-n-ship-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
