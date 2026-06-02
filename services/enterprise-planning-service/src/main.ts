import { buildPlanningApp } from "./app";
async function main() {
  const app = await buildPlanningApp();
  await app.listen({ host: "0.0.0.0", port: 4065 });
  // eslint-disable-next-line no-console
  console.log("enterprise-planning-service listening on 4065");
}
main().catch((err) => { console.error(err); process.exit(1); });
