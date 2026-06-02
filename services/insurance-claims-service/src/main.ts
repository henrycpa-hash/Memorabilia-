import { buildInsuranceApp } from "./app";
async function main() {
  const app = await buildInsuranceApp();
  await app.listen({ host: "0.0.0.0", port: 4024 });
  // eslint-disable-next-line no-console
  console.log("insurance-claims-service listening on 4024");
}
main().catch((err) => { console.error(err); process.exit(1); });
