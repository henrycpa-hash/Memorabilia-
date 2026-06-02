import { buildLegalApp } from "./app";
async function main() {
  const app = await buildLegalApp();
  await app.listen({ host: "0.0.0.0", port: 4042 });
  // eslint-disable-next-line no-console
  console.log("legal-packet-service listening on 4042");
}
main().catch((err) => { console.error(err); process.exit(1); });
