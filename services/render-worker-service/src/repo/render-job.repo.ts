export type RenderTemplateKey =
  | "auction_winner_card"
  | "record_sale_card"
  | "creator_drop_card"
  | "countdown_card"
  | "collectible_heat_card"
  | "royalty_enabled_card"
  | "verified_trade_milestone_card";

export type RenderJobStatus = "queued" | "rendering" | "completed" | "failed";

export type RenderJob = {
  id: string;
  assetId: string;
  templateKey: RenderTemplateKey;
  payloadJson: Record<string, unknown>;
  status: RenderJobStatus;
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

const jobs: RenderJob[] = [];

export const renderJobRepo = {
  insert(j: RenderJob) {
    jobs.push(j);
    return j;
  },
  findById(id: string) {
    return jobs.find((j) => j.id === id) || null;
  },
  list() {
    return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  listForAsset(assetId: string) {
    return jobs.filter((j) => j.assetId === assetId);
  },
  listQueued() {
    return jobs.filter((j) => j.status === "queued");
  },
  update(id: string, patch: Partial<RenderJob>) {
    const j = jobs.find((x) => x.id === id);
    if (j) Object.assign(j, patch);
    return j || null;
  }
};
