import { buildSsoApp } from "./app";
async function main() {
  const app = await buildSsoApp();
  await app.listen({ host: "0.0.0.0", port: 4038 });
  // eslint-disable-next-line no-console
  console.log("sso-federation-service listening on 4038");
}
main().catch((err) => { console.error(err); process.exit(1); });
