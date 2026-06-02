import { buildFinanceApp } from "./app";
async function main() {
  const app = await buildFinanceApp();
  await app.listen({ host: "0.0.0.0", port: 4033 });
  // eslint-disable-next-line no-console
  console.log("finance-export-service listening on 4033");
}
main().catch((err) => { console.error(err); process.exit(1); });
