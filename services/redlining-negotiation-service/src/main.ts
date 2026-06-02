import { buildRedliningApp } from "./app";
async function main() {
  const app = await buildRedliningApp();
  await app.listen({ host: "0.0.0.0", port: 4055 });
  // eslint-disable-next-line no-console
  console.log("redlining-negotiation-service listening on 4055");
}
main().catch((err) => { console.error(err); process.exit(1); });
