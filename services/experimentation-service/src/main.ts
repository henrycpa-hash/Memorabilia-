import { buildExpApp } from "./app";
async function main() {
  const app = await buildExpApp();
  await app.listen({ host: "0.0.0.0", port: 4026 });
  // eslint-disable-next-line no-console
  console.log("experimentation-service listening on 4026");
}
main().catch((err) => { console.error(err); process.exit(1); });
