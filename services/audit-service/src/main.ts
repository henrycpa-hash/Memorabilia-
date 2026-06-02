import { buildAuditApp } from "./app";

async function main() {
  const app = await buildAuditApp();
  await app.listen({ host: "0.0.0.0", port: 4014 });
  // eslint-disable-next-line no-console
  console.log("audit-service listening on 4014");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
