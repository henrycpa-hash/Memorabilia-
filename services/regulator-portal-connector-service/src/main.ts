import { buildPortalConnectorApp } from "./app";
async function main() {
  const app = await buildPortalConnectorApp();
  await app.listen({ host: "0.0.0.0", port: 4069 });
  // eslint-disable-next-line no-console
  console.log("regulator-portal-connector-service listening on 4069");
}
main().catch((err) => { console.error(err); process.exit(1); });
