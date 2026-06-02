import { buildCollabRedliningApp } from "./app";
async function main() {
  const app = await buildCollabRedliningApp();
  await app.listen({ host: "0.0.0.0", port: 4062 });
  // eslint-disable-next-line no-console
  console.log("collaborative-redlining-service listening on 4062");
}
main().catch((err) => { console.error(err); process.exit(1); });
