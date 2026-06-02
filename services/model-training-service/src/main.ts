import { buildTrainingApp } from "./app";
async function main() {
  const app = await buildTrainingApp();
  await app.listen({ host: "0.0.0.0", port: 4035 });
  // eslint-disable-next-line no-console
  console.log("model-training-service listening on 4035");
}
main().catch((err) => { console.error(err); process.exit(1); });
