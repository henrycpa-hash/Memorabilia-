import { buildTaxApp } from "./app";
async function main() {
  const app = await buildTaxApp();
  await app.listen({ host: "0.0.0.0", port: 4054 });
  // eslint-disable-next-line no-console
  console.log("tax-localization-service listening on 4054");
}
main().catch((err) => { console.error(err); process.exit(1); });
