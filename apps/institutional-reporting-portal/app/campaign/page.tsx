import { generateAndRender } from "../../lib/report-page";

export default async function CampaignReportPage() {
  return await generateAndRender(
    "campaign_and_experiment",
    "Campaign & experiment report",
    "Live campaign and experiment volume across the platform."
  );
}
