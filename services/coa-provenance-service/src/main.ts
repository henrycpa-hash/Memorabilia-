import { buildCoaApp } from "./app";

async function main() {
  const app = await buildCoaApp();
  await app.listen({ host: "0.0.0.0", port: 4004 });
  // eslint-disable-next-line no-console
  console.log("coa-provenance-service listening on 4004");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
