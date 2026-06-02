import { buildBillingApp } from "./app";
async function main() {
  const app = await buildBillingApp();
  await app.listen({ host: "0.0.0.0", port: 4039 });
  // eslint-disable-next-line no-console
  console.log("billing-metering-service listening on 4039");
}
main().catch((err) => { console.error(err); process.exit(1); });
