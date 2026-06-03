import { buildRoyaltyVaultApp } from "./app";

async function main() {
  const app = await buildRoyaltyVaultApp();
  const port = Number(process.env.ROYALTY_VAULT_SERVICE_PORT || 4080);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`royalty-vault-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
