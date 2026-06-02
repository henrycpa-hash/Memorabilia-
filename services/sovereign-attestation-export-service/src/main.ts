import { buildAttestationExportApp } from "./app";
async function main() {
  const app = await buildAttestationExportApp();
  await app.listen({ host: "0.0.0.0", port: 4066 });
  // eslint-disable-next-line no-console
  console.log("sovereign-attestation-export-service listening on 4066");
}
main().catch((err) => { console.error(err); process.exit(1); });
