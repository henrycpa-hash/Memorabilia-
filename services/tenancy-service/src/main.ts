import { buildTenancyApp } from "./app";
async function main() {
  const app = await buildTenancyApp();
  await app.listen({ host: "0.0.0.0", port: 4031 });
  // eslint-disable-next-line no-console
  console.log("tenancy-service listening on 4031");
}
main().catch((err) => { console.error(err); process.exit(1); });
