import { buildMlApp } from "./app";
async function main() {
  const app = await buildMlApp();
  await app.listen({ host: "0.0.0.0", port: 4025 });
  // eslint-disable-next-line no-console
  console.log("ml-risk-inference-service listening on 4025");
}
main().catch((err) => { console.error(err); process.exit(1); });
