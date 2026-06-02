import { buildLegalConnectorApp } from "./app";
async function main() {
  const app = await buildLegalConnectorApp();
  await app.listen({ host: "0.0.0.0", port: 4051 });
  // eslint-disable-next-line no-console
  console.log("legal-systems-connector-service listening on 4051");
}
main().catch((err) => { console.error(err); process.exit(1); });
