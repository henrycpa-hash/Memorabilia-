import { buildAthleteIndexApp } from "./app";

async function main() {
  const app = await buildAthleteIndexApp();
  const port = Number(process.env.ATHLETE_INDEX_SERVICE_PORT || 4076);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`athlete-index-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
