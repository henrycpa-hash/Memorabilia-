import { buildCampaignApp } from "./app";

async function main() {
  const app = await buildCampaignApp();
  await app.listen({ host: "0.0.0.0", port: 4018 });
  // eslint-disable-next-line no-console
  console.log("campaign-service listening on 4018");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
