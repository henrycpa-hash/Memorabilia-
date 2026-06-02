import { buildLedgerApp } from "./app";

async function main() {
  const app = await buildLedgerApp();
  await app.listen({ host: "0.0.0.0", port: 4012 });
  // eslint-disable-next-line no-console
  console.log("ledger-payout-service listening on 4012");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
