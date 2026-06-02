import { buildIdentityApp } from "./app";

async function main() {
  const app = await buildIdentityApp();
  await app.listen({ host: "0.0.0.0", port: 4001 });
  // eslint-disable-next-line no-console
  console.log("identity-service listening on 4001");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
