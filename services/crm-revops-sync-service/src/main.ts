import { buildCrmRevopsApp } from "./app";
async function main() {
  const app = await buildCrmRevopsApp();
  await app.listen({ host: "0.0.0.0", port: 4071 });
  // eslint-disable-next-line no-console
  console.log("crm-revops-sync-service listening on 4071");
}
main().catch((err) => { console.error(err); process.exit(1); });
