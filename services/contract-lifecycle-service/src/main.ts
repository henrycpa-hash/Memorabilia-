import { buildContractApp } from "./app";
async function main() {
  const app = await buildContractApp();
  await app.listen({ host: "0.0.0.0", port: 4041 });
  // eslint-disable-next-line no-console
  console.log("contract-lifecycle-service listening on 4041");
}
main().catch((err) => { console.error(err); process.exit(1); });
