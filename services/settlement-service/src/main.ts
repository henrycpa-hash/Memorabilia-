import { buildSettlementApp } from "./app";

async function main() {
  const app = await buildSettlementApp();
  await app.listen({ host: "0.0.0.0", port: 4015 });
  // eslint-disable-next-line no-console
  console.log("settlement-service listening on 4015");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
