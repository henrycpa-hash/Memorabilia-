import { buildSlaApp } from "./app";
async function main() {
  const app = await buildSlaApp();
  await app.listen({ host: "0.0.0.0", port: 4045 });
  // eslint-disable-next-line no-console
  console.log("sla-governance-service listening on 4045");
}
main().catch((err) => { console.error(err); process.exit(1); });
