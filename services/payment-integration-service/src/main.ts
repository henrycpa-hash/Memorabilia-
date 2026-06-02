import { buildPaymentApp } from "./app";
async function main() {
  const app = await buildPaymentApp();
  await app.listen({ host: "0.0.0.0", port: 4022 });
  // eslint-disable-next-line no-console
  console.log("payment-integration-service listening on 4022");
}
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err); process.exit(1);
});
