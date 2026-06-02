import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import type { Report, ReportFormat, ReportType, ReportSection } from "@crownx-jewel/shared-reporting";
import { reportRepo } from "../repo/report.repo";

const warehouseBase = () =>
  process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4020";
const fraudBase = () =>
  process.env.FRAUD_SERVICE_URL || "http://localhost:4017";
const settlementBase = () =>
  process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";
const campaignBase = () =>
  process.env.CAMPAIGN_SERVICE_URL || "http://localhost:4018";
const expBase = () =>
  process.env.EXPERIMENT_SERVICE_URL || "http://localhost:4026";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type Metrics = {
  market?: Record<string, number | string>;
  growth?: Record<string, number>;
  trust?: Record<string, number>;
  totals?: Record<string, number>;
};

function metricsToSection(label: string, m: Record<string, number | string> = {}): ReportSection {
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(m)) {
    out[k] = typeof v === "number" ? Number(v.toFixed(4)) : v;
  }
  return { key: label.toLowerCase().replace(/\s+/g, "_"), label, metrics: out };
}

export const reportingService = {
  async generate(input: {
    reportType: ReportType;
    format: ReportFormat;
    scope?: { creatorId?: string; from?: string; to?: string };
  }): Promise<Report> {
    const sections: ReportSection[] = [];

    // Pull warehouse metrics for any report type — they're cheap and always relevant.
    const metrics = await fetchOk<Metrics>(`${warehouseBase()}/warehouse/metrics`);

    if (input.reportType === "board_executive") {
      if (metrics?.market) sections.push(metricsToSection("Market", metrics.market));
      if (metrics?.growth) sections.push(metricsToSection("Growth", metrics.growth));
      if (metrics?.trust) sections.push(metricsToSection("Trust", metrics.trust));
    }

    if (input.reportType === "creator_performance") {
      if (metrics?.market) sections.push(metricsToSection("Market", metrics.market));
      if (metrics?.growth) sections.push(metricsToSection("Growth", metrics.growth));
      // Pull live campaigns for a quick portfolio cut.
      const campaigns = await fetchOk<unknown[]>(`${campaignBase()}/campaigns`);
      sections.push({
        key: "campaign_portfolio",
        label: "Campaign portfolio",
        metrics: { totalCampaigns: (campaigns || []).length }
      });
    }

    if (input.reportType === "risk_and_trust") {
      if (metrics?.trust) sections.push(metricsToSection("Trust KPIs", metrics.trust));
      const alerts = await fetchOk<unknown[]>(`${fraudBase()}/fraud/alerts`);
      sections.push({
        key: "fraud_alerts",
        label: "Fraud alerts",
        metrics: { totalAlerts: (alerts || []).length }
      });
    }

    if (input.reportType === "settlement_and_payout") {
      const settlements = await fetchOk<Array<{ settlementState: string; grossAmount: string }>>(
        `${settlementBase()}/settlements`
      );
      const totalSettlements = (settlements || []).length;
      const completed = (settlements || []).filter((s) => s.settlementState === "completed").length;
      const onHold = (settlements || []).filter((s) => s.settlementState === "on_hold").length;
      const refunded = (settlements || []).filter((s) => s.settlementState === "refunded").length;
      const gmv = (settlements || []).reduce(
        (acc, s) => acc + (s.settlementState === "completed" ? Number(s.grossAmount) : 0),
        0
      );
      sections.push({
        key: "settlement_funnel",
        label: "Settlement funnel",
        metrics: {
          totalSettlements,
          completed,
          onHold,
          refunded,
          completedGmv: Number(gmv.toFixed(2))
        }
      });
    }

    if (input.reportType === "campaign_and_experiment") {
      const campaigns = await fetchOk<Array<{ status: string }>>(`${campaignBase()}/campaigns`);
      const experiments = await fetchOk<Array<{ status: string }>>(`${expBase()}/experiments`);
      sections.push({
        key: "campaigns",
        label: "Campaigns",
        metrics: {
          total: (campaigns || []).length,
          live: (campaigns || []).filter((c) => c.status === "live").length
        }
      });
      sections.push({
        key: "experiments",
        label: "Experiments",
        metrics: {
          total: (experiments || []).length,
          running: (experiments || []).filter((e) => e.status === "running").length
        }
      });
    }

    if (input.reportType === "regulatory_export") {
      // Wave 5 regulatory export is a placeholder: just market totals.
      // Wave 6 wires in tax/jurisdiction breakdowns.
      if (metrics?.market) sections.push(metricsToSection("Market", metrics.market));
      sections.push({
        key: "regulatory_note",
        label: "Note",
        metrics: { description: "Wave 5 placeholder — Wave 6 adds jurisdiction breakdowns" }
      });
    }

    const report: Report = {
      id: newId(),
      reportType: input.reportType,
      format: input.format,
      generatedAt: nowIso(),
      sections,
      scope: input.scope
    };
    reportRepo.insert(report);

    await publishOutbox({
      id: newId(),
      eventType: "reporting.report.generated",
      aggregateId: report.id,
      aggregateType: "report",
      payload: { reportId: report.id, reportType: report.reportType },
      occurredAt: nowIso()
    });

    return report;
  },

  list: () => reportRepo.list(),
  findById: (id: string) => reportRepo.findById(id)
};
