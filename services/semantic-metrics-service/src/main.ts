import { buildMetricsApp } from "./app";
async function main() {
  const app = await buildMetricsApp();
  await app.listen({ host: "0.0.0.0", port: 4036 });
  // eslint-disable-next-line no-console
  console.log("semantic-metrics-service listening on 4036");
}
main().catch((err) => { console.error(err); process.exit(1); });
