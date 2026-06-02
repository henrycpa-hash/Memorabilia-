import { buildSovereignApp } from "./app";
async function main() {
  const app = await buildSovereignApp();
  await app.listen({ host: "0.0.0.0", port: 4053 });
  // eslint-disable-next-line no-console
  console.log("sovereign-deployment-service listening on 4053");
}
main().catch((err) => { console.error(err); process.exit(1); });
