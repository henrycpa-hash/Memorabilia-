import { buildPrivacyApp } from "./app";
async function main() {
  const app = await buildPrivacyApp();
  await app.listen({ host: "0.0.0.0", port: 4049 });
  // eslint-disable-next-line no-console
  console.log("privacy-governance-service listening on 4049");
}
main().catch((err) => { console.error(err); process.exit(1); });
