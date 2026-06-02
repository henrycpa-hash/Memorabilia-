import { buildPartnerApp } from "./app";
async function main() {
  const app = await buildPartnerApp();
  await app.listen({ host: "0.0.0.0", port: 4030 });
  // eslint-disable-next-line no-console
  console.log("partner-integration-service listening on 4030");
}
main().catch((err) => { console.error(err); process.exit(1); });
