import type { FastifyInstance } from "fastify";

const assetBase = () => process.env.ASSET_SERVICE_URL || "http://localhost:4002";
const coaBase = () => process.env.COA_SERVICE_URL || "http://localhost:4004";
const royaltyBase = () =>
  process.env.ROYALTY_SERVICE_URL || "http://localhost:4006";
const auctionBase = () => process.env.AUCTION_SERVICE_URL || "http://localhost:4009";
const offerBase = () => process.env.OFFER_SERVICE_URL || "http://localhost:4010";
const watchlistBase = () =>
  process.env.WATCHLIST_SERVICE_URL || "http://localhost:4011";
const rankingBase = () =>
  process.env.RANKING_SERVICE_URL || "http://localhost:4013";
const fraudBase = () => process.env.FRAUD_SERVICE_URL || "http://localhost:4017";
const campaignBase = () =>
  process.env.CAMPAIGN_SERVICE_URL || "http://localhost:4018";
const renderBase = () =>
  process.env.RENDER_SERVICE_URL || "http://localhost:4019";
const settlementBase = () =>
  process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type Asset = {
  id: string;
  slug: string;
  title: string;
  description: string;
  assetType: string;
  authenticityStatus: string;
  editionType: string;
  currentOwnerId: string;
  originatorId?: string;
};

type Settlement = {
  id: string;
  assetId: string;
  settlementState: string;
  escrowState: string;
  grossAmount: string;
  createdAt: string;
};

/**
 * Wave 4 derives "settlementHealth" as a single string. Used by the public
 * story page to flash a trust badge.
 */
function deriveSettlementHealth(settlements: Settlement[] | null): string {
  if (!settlements || settlements.length === 0) return "unknown";
  const recent = settlements.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )[0];
  if (recent.settlementState === "completed") return "trusted";
  if (recent.settlementState === "on_hold") return "review";
  if (recent.settlementState === "refunded") return "refunded";
  return "in_progress";
}

export function registerPublicStoryRoutes(app: FastifyInstance) {
  /**
   * Wave 4 public story. Adds on top of Wave 3:
   *   creatorReputation  — momentum + tier (from fraud-risk-service)
   *   campaigns          — currently-live campaigns for this asset's creator
   *   renderedCards      — the latest completed render jobs for this asset
   *   recentSale         — the most recent completed settlement
   *   settlementHealth   — "trusted" | "review" | "refunded" | "in_progress" | "unknown"
   */
  app.get("/api/public/story/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const assetRes = await fetch(`${assetBase()}/public/assets/${slug}`);
    if (!assetRes.ok) {
      return reply.code(404).send({ error: "not_found" });
    }
    const asset = (await assetRes.json()) as Asset;

    const [
      coa,
      royaltyRule,
      timeline,
      ranking,
      activeAuction,
      acceptedOffersCount,
      watcherCount,
      shareCards,
      activeListings,
      renderedCards,
      creatorRep,
      assetSettlements
    ] = await Promise.all([
      fetchOk<unknown>(`${coaBase()}/coa/by-asset/${asset.id}`),
      fetchOk<unknown>(`${royaltyBase()}/rules/by-asset/${asset.id}`),
      fetchOk<unknown[]>(`${assetBase()}/assets/${asset.id}/timeline`),
      fetchOk<unknown>(`${rankingBase()}/trending/assets/${asset.id}`),
      fetchOk<unknown>(`${auctionBase()}/auctions/active/by-asset/${asset.id}`),
      fetchOk<{ count: number }>(
        `${offerBase()}/offers/count-accepted/${asset.id}`
      ),
      fetchOk<{ count: number }>(
        `${watchlistBase()}/watchlists/count/${asset.id}`
      ),
      fetchOk<unknown[]>(`${rankingBase()}/share-cards/${asset.id}`),
      fetchOk<Array<{ assetId: string; status: string }>>(
        `${assetBase()}/listings`
      ),
      fetchOk<unknown[]>(`${renderBase()}/render/jobs/by-asset/${asset.id}`),
      asset.originatorId
        ? fetchOk<unknown>(
            `${fraudBase()}/reputation/creators/${asset.originatorId}`
          )
        : Promise.resolve(null),
      // We don't have a per-asset settlement endpoint — fetch all and filter.
      // Wave 5 narrows.
      fetchOk<Settlement[]>(`${settlementBase()}/settlements`)
    ]);

    const activeListing =
      (activeListings || []).find(
        (l) => l.assetId === asset.id && l.status === "active"
      ) || null;

    const settlementsForAsset = (assetSettlements || []).filter(
      (s) => s.assetId === asset.id
    );
    const recentSale =
      settlementsForAsset
        .filter((s) => s.settlementState === "completed")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
    const settlementHealth = deriveSettlementHealth(settlementsForAsset);

    // Live campaigns from this creator (best-effort).
    const liveCampaigns = asset.originatorId
      ? await fetchOk<unknown[]>(`${campaignBase()}/campaigns/live`).then(
          (all) =>
            (all as Array<{ creatorId?: string }> | null)?.filter(
              (c) => c.creatorId === asset.originatorId
            ) || []
        )
      : [];

    // Fire-and-forget +1 view trending signal
    fetch(`${rankingBase()}/trending/signals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: asset.id, signal: "view" })
    }).catch(() => undefined);

    // Also emit a story-view warehouse fact.
    const warehouseBase =
      process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4020";
    fetch(`${warehouseBase}/warehouse/facts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "listing_published", // Wave 5 adds a dedicated story_view type
        assetId: asset.id,
        sourceId: asset.id
      })
    }).catch(() => undefined);

    reply.send({
      asset: {
        id: asset.id,
        slug: asset.slug,
        title: asset.title,
        description: asset.description,
        assetType: asset.assetType,
        authenticityStatus: asset.authenticityStatus,
        editionType: asset.editionType,
        currentOwnerId: asset.currentOwnerId
      },
      coa,
      royaltyEnabled: !!royaltyRule,
      ranking: ranking || null,
      timeline: timeline || [],
      market: {
        activeListing,
        activeAuction: activeAuction || null,
        acceptedOfferCount: acceptedOffersCount?.count ?? 0,
        watchlistCount: watcherCount?.count ?? 0,
        recentSale,
        settlementHealth
      },
      shareCards: shareCards || [],
      renderedCards: renderedCards || [],
      creatorReputation: creatorRep || null,
      campaigns: liveCampaigns,
      story: {
        headline: asset.title,
        origin: asset.assetType,
        trustState: asset.authenticityStatus,
        publicUrl: `/collectible/${asset.slug}`
      }
    });
  });
}
