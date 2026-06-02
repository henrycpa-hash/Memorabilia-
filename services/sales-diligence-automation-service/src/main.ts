import { buildSalesApp } from "./app";
async function main() {
  const app = await buildSalesApp();
  await app.listen({ host: "0.0.0.0", port: 4059 });
  // eslint-disable-next-line no-console
  console.log("sales-diligence-automation-service listening on 4059");
}
main().catch((err) => { console.error(err); process.exit(1); });
