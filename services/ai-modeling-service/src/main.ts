import { buildAiModelingApp } from "./app";

async function main() {
  const app = await buildAiModelingApp();
  const port = Number(process.env.AI_MODELING_SERVICE_PORT || 4082);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`ai-modeling-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
