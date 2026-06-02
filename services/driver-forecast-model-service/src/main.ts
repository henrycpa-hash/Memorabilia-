import { buildDriverForecastApp } from "./app";
async function main() {
  const app = await buildDriverForecastApp();
  await app.listen({ host: "0.0.0.0", port: 4070 });
  // eslint-disable-next-line no-console
  console.log("driver-forecast-model-service listening on 4070");
}
main().catch((err) => { console.error(err); process.exit(1); });
