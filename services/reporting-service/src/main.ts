import { buildReportingApp } from "./app";
async function main() {
  const app = await buildReportingApp();
  await app.listen({ host: "0.0.0.0", port: 4028 });
  // eslint-disable-next-line no-console
  console.log("reporting-service listening on 4028");
}
main().catch((err) => { console.error(err); process.exit(1); });
