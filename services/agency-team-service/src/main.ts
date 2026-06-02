import { buildAgencyApp } from "./app";
async function main() {
  const app = await buildAgencyApp();
  await app.listen({ host: "0.0.0.0", port: 4032 });
  // eslint-disable-next-line no-console
  console.log("agency-team-service listening on 4032");
}
main().catch((err) => { console.error(err); process.exit(1); });
