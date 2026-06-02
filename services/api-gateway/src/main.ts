import { buildGateway } from "./app";

async function main() {
  const app = await buildGateway();
  const port = Number(process.env.GATEWAY_PORT || 4000);
  await app.listen({ host: "0.0.0.0", port });
  // eslint-disable-next-line no-console
  console.log(`api-gateway listening on ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
