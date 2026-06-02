import { buildRoyaltyApp } from "./app";

async function main() {
  const app = await buildRoyaltyApp();
  await app.listen({ host: "0.0.0.0", port: 4006 });
  // eslint-disable-next-line no-console
  console.log("royalty-engine-service listening on 4006");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
