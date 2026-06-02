import { generateAndRender } from "../../lib/report-page";

export default async function SettlementReportPage() {
  return await generateAndRender(
    "settlement_and_payout",
    "Settlement & payout report",
    "Settlement funnel: completed / on_hold / refunded counts plus completed GMV."
  );
}
