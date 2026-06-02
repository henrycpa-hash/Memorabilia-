import { buildSignatureApp } from "./app";
async function main() {
  const app = await buildSignatureApp();
  await app.listen({ host: "0.0.0.0", port: 4047 });
  // eslint-disable-next-line no-console
  console.log("signature-integration-service listening on 4047");
}
main().catch((err) => { console.error(err); process.exit(1); });
