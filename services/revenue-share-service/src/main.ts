import { buildRevShareApp } from "./app";
async function main() {
  const app = await buildRevShareApp();
  await app.listen({ host: "0.0.0.0", port: 4048 });
  // eslint-disable-next-line no-console
  console.log("revenue-share-service listening on 4048");
}
main().catch((err) => { console.error(err); process.exit(1); });
