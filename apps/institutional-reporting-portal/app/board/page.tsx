import { generateAndRender } from "../../lib/report-page";

export default async function BoardReportPage() {
  return await generateAndRender(
    "board_executive",
    "Board executive report",
    "GMV, growth, and trust KPIs in a single board-grade snapshot. Generated on demand from the analytics warehouse."
  );
}
