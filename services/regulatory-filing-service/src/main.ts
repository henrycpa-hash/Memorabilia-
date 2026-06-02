import { buildRegulatoryApp } from "./app";
async function main() {
  const app = await buildRegulatoryApp();
  await app.listen({ host: "0.0.0.0", port: 4058 });
  // eslint-disable-next-line no-console
  console.log("regulatory-filing-service listening on 4058");
}
main().catch((err) => { console.error(err); process.exit(1); });
