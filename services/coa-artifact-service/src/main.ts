import { buildCoaArtifactApp } from "./app";

async function main() {
  const app = await buildCoaArtifactApp();
  const port = Number(process.env.COA_ARTIFACT_SERVICE_PORT || 4081);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`coa-artifact-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
