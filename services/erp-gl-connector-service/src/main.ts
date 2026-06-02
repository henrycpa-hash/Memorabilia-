import { buildErpApp } from "./app";
async function main() {
  const app = await buildErpApp();
  await app.listen({ host: "0.0.0.0", port: 4040 });
  // eslint-disable-next-line no-console
  console.log("erp-gl-connector-service listening on 4040");
}
main().catch((err) => { console.error(err); process.exit(1); });
