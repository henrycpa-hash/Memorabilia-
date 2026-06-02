import { buildPasskeyApp } from "./app";

async function main() {
  const app = await buildPasskeyApp();
  const port = Number(process.env.PASSKEY_SERVICE_PORT || 4075);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`passkey-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
