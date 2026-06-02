import { buildSocialApp } from "./app";
async function main() {
  const app = await buildSocialApp();
  await app.listen({ host: "0.0.0.0", port: 4029 });
  // eslint-disable-next-line no-console
  console.log("social-publishing-service listening on 4029");
}
main().catch((err) => { console.error(err); process.exit(1); });
