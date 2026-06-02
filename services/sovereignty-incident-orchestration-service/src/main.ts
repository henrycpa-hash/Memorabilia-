import { buildIncidentOrchApp } from "./app";
async function main() {
  const app = await buildIncidentOrchApp();
  await app.listen({ host: "0.0.0.0", port: 4072 });
  // eslint-disable-next-line no-console
  console.log("sovereignty-incident-orchestration-service listening on 4072");
}
main().catch((err) => { console.error(err); process.exit(1); });
