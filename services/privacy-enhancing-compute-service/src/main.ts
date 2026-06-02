import { buildPrivacyComputeApp } from "./app";
async function main() {
  const app = await buildPrivacyComputeApp();
  await app.listen({ host: "0.0.0.0", port: 4057 });
  // eslint-disable-next-line no-console
  console.log("privacy-enhancing-compute-service listening on 4057");
}
main().catch((err) => { console.error(err); process.exit(1); });
