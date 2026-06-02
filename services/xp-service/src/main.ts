import { buildXpApp } from "./app";

async function main() {
  const app = await buildXpApp();
  const port = Number(process.env.XP_SERVICE_PORT || 4073);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`xp-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
