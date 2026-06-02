import { generateAndRender } from "../../lib/report-page";

export default async function RiskReportPage() {
  return await generateAndRender(
    "risk_and_trust",
    "Risk & trust report",
    "Trust KPIs (settlement holds, dispute rate, fraud alert rate) plus open fraud alert volume."
  );
}
