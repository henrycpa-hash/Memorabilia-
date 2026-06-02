import { buildWarehouseApp } from "./app";

async function main() {
  const app = await buildWarehouseApp();
  await app.listen({ host: "0.0.0.0", port: 4020 });
  // eslint-disable-next-line no-console
  console.log("analytics-warehouse-service listening on 4020");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
