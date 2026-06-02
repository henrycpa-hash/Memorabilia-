import { buildAutomationApp } from "./app";

async function main() {
  const app = await buildAutomationApp();
  await app.listen({ host: "0.0.0.0", port: 4021 });
  // eslint-disable-next-line no-console
  console.log("automation-orchestrator-service listening on 4021");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
