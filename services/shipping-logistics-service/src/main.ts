import { buildShippingApp } from "./app";
async function main() {
  const app = await buildShippingApp();
  await app.listen({ host: "0.0.0.0", port: 4023 });
  // eslint-disable-next-line no-console
  console.log("shipping-logistics-service listening on 4023");
}
main().catch((err) => { console.error(err); process.exit(1); });
