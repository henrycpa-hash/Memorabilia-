import { buildRankingApp } from "./app";

async function main() {
  const app = await buildRankingApp();
  await app.listen({ host: "0.0.0.0", port: 4013 });
  // eslint-disable-next-line no-console
  console.log("growth-ranking-service listening on 4013");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
