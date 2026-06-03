import { buildTermsApp } from "./app";

async function main() {
  const app = await buildTermsApp();
  const port = Number(process.env.TERMS_SERVICE_PORT || 4083);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`terms-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
