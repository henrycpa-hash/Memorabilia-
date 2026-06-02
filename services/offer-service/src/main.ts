import { buildOfferApp } from "./app";

async function main() {
  const app = await buildOfferApp();
  await app.listen({ host: "0.0.0.0", port: 4010 });
  // eslint-disable-next-line no-console
  console.log("offer-service listening on 4010");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
