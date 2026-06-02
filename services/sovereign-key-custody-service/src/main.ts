import { buildCustodyApp } from "./app";
async function main() {
  const app = await buildCustodyApp();
  await app.listen({ host: "0.0.0.0", port: 4060 });
  // eslint-disable-next-line no-console
  console.log("sovereign-key-custody-service listening on 4060");
}
main().catch((err) => { console.error(err); process.exit(1); });
