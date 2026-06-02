import { buildProcurementApp } from "./app";
async function main() {
  const app = await buildProcurementApp();
  await app.listen({ host: "0.0.0.0", port: 4052 });
  // eslint-disable-next-line no-console
  console.log("procurement-automation-service listening on 4052");
}
main().catch((err) => { console.error(err); process.exit(1); });
