import { generateAndRender } from "../../lib/report-page";

export default async function CreatorReportPage() {
  return await generateAndRender(
    "creator_performance",
    "Creator performance report",
    "Per-creator commercialization view: market metrics, growth signals, and active campaign portfolio."
  );
}
