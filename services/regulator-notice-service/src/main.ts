import { buildRegulatorNoticeApp } from "./app";
async function main() {
  const app = await buildRegulatorNoticeApp();
  await app.listen({ host: "0.0.0.0", port: 4064 });
  // eslint-disable-next-line no-console
  console.log("regulator-notice-service listening on 4064");
}
main().catch((err) => { console.error(err); process.exit(1); });
