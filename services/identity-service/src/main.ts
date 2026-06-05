import { buildIdentityApp } from "./app";

async function main() {
  const app = await buildIdentityApp();
  const port = Number(process.env.PORT || process.env.IDENTITY_PORT || 4001);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`identity-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
