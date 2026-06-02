import { buildCollectionsApp } from "./app";
async function main() {
  const app = await buildCollectionsApp();
  await app.listen({ host: "0.0.0.0", port: 4046 });
  // eslint-disable-next-line no-console
  console.log("collections-dunning-service listening on 4046");
}
main().catch((err) => { console.error(err); process.exit(1); });
