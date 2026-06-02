import { buildTaxRemittanceApp } from "./app";
async function main() {
  const app = await buildTaxRemittanceApp();
  await app.listen({ host: "0.0.0.0", port: 4061 });
  // eslint-disable-next-line no-console
  console.log("tax-remittance-service listening on 4061");
}
main().catch((err) => { console.error(err); process.exit(1); });
