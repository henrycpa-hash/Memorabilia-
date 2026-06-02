import { buildRenderApp } from "./app";

async function main() {
  const app = await buildRenderApp();
  await app.listen({ host: "0.0.0.0", port: 4019 });
  // eslint-disable-next-line no-console
  console.log("render-worker-service listening on 4019");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
