import { buildAuthApp } from "./app";

async function main() {
  const app = await buildAuthApp();
  await app.listen({ host: "0.0.0.0", port: 4003 });
  // eslint-disable-next-line no-console
  console.log("authentication-service listening on 4003");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
