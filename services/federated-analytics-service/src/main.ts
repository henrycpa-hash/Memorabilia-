import { buildFederatedApp } from "./app";
async function main() {
  const app = await buildFederatedApp();
  await app.listen({ host: "0.0.0.0", port: 4044 });
  // eslint-disable-next-line no-console
  console.log("federated-analytics-service listening on 4044");
}
main().catch((err) => { console.error(err); process.exit(1); });
