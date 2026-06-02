import { buildCrmApp } from "./app";
async function main() {
  const app = await buildCrmApp();
  await app.listen({ host: "0.0.0.0", port: 4027 });
  // eslint-disable-next-line no-console
  console.log("creator-crm-service listening on 4027");
}
main().catch((err) => { console.error(err); process.exit(1); });
