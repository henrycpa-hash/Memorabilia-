import { buildConnectorApp } from "./app";
async function main() {
  const app = await buildConnectorApp();
  await app.listen({ host: "0.0.0.0", port: 4034 });
  // eslint-disable-next-line no-console
  console.log("connector-runtime-service listening on 4034");
}
main().catch((err) => { console.error(err); process.exit(1); });
