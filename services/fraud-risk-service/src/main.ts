import { buildFraudApp } from "./app";

async function main() {
  const app = await buildFraudApp();
  await app.listen({ host: "0.0.0.0", port: 4017 });
  // eslint-disable-next-line no-console
  console.log("fraud-risk-service listening on 4017");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
