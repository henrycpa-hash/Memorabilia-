import { buildNotificationApp } from "./app";

async function main() {
  const app = await buildNotificationApp();
  await app.listen({ host: "0.0.0.0", port: 4008 });
  // eslint-disable-next-line no-console
  console.log("notification-service listening on 4008");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
