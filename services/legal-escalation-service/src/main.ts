import { buildEscalationApp } from "./app";
async function main() {
  const app = await buildEscalationApp();
  await app.listen({ host: "0.0.0.0", port: 4063 });
  // eslint-disable-next-line no-console
  console.log("legal-escalation-service listening on 4063");
}
main().catch((err) => { console.error(err); process.exit(1); });
