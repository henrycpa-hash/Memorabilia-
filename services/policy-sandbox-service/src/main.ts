import { buildSandboxApp } from "./app";
async function main() {
  const app = await buildSandboxApp();
  await app.listen({ host: "0.0.0.0", port: 4043 });
  // eslint-disable-next-line no-console
  console.log("policy-sandbox-service listening on 4043");
}
main().catch((err) => { console.error(err); process.exit(1); });
