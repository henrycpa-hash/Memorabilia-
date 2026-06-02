import { buildPolicyApp } from "./app";
async function main() {
  const app = await buildPolicyApp();
  await app.listen({ host: "0.0.0.0", port: 4037 });
  // eslint-disable-next-line no-console
  console.log("policy-compliance-service listening on 4037");
}
main().catch((err) => { console.error(err); process.exit(1); });
