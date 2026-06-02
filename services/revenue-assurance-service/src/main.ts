import { buildAssuranceApp } from "./app";
async function main() {
  const app = await buildAssuranceApp();
  await app.listen({ host: "0.0.0.0", port: 4056 });
  // eslint-disable-next-line no-console
  console.log("revenue-assurance-service listening on 4056");
}
main().catch((err) => { console.error(err); process.exit(1); });
