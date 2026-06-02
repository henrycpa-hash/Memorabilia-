import { buildRailConnectorApp } from "./app";
async function main() {
  const app = await buildRailConnectorApp();
  await app.listen({ host: "0.0.0.0", port: 4067 });
  // eslint-disable-next-line no-console
  console.log("remittance-rail-connector-service listening on 4067");
}
main().catch((err) => { console.error(err); process.exit(1); });
