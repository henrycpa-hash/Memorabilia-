import { buildAuthEngineApp } from "./app";

async function main() {
  const app = await buildAuthEngineApp();
  const port = Number(process.env.AUTH_ENGINE_SERVICE_PORT || 4078);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`authentication-engine-service listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
