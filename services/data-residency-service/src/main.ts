import { buildResidencyApp } from "./app";
async function main() {
  const app = await buildResidencyApp();
  await app.listen({ host: "0.0.0.0", port: 4050 });
  // eslint-disable-next-line no-console
  console.log("data-residency-service listening on 4050");
}
main().catch((err) => { console.error(err); process.exit(1); });
