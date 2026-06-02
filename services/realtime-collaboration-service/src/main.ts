import { buildRealtimeCollabApp } from "./app";
async function main() {
  const app = await buildRealtimeCollabApp();
  await app.listen({ host: "0.0.0.0", port: 4068 });
  // eslint-disable-next-line no-console
  console.log("realtime-collaboration-service listening on 4068");
}
main().catch((err) => { console.error(err); process.exit(1); });
