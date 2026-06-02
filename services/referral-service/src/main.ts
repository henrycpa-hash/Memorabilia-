import { buildReferralApp } from "./app";

async function main() {
  const app = await buildReferralApp();
  await app.listen({ host: "0.0.0.0", port: 4007 });
  // eslint-disable-next-line no-console
  console.log("referral-service listening on 4007");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
