import { buildDisputeApp } from "./app";

async function main() {
  const app = await buildDisputeApp();
  await app.listen({ host: "0.0.0.0", port: 4016 });
  // eslint-disable-next-line no-console
  console.log("dispute-service listening on 4016");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
