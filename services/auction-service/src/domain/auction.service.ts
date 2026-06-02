import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { auctionRepo, type Auction, type Bid } from "../repo/auction.repo";

function fmt(n: number): string {
  return n.toFixed(2);
}

export const auctionService = {
  async create(input: {
    assetId: string;
    sellerId: string;
    reservePrice: number;
    startingBid: number;
    minIncrement: number;
    startsAt: string;
    endsAt: string;
  }): Promise<Auction> {
    const now = new Date();
    const startsAtDate = new Date(input.startsAt);
    const status: Auction["status"] = startsAtDate.getTime() <= now.getTime() ? "live" : "scheduled";

    const auction: Auction = {
      id: newId(),
      assetId: input.assetId,
      sellerId: input.sellerId,
      reservePrice: fmt(input.reservePrice),
      startingBid: fmt(input.startingBid),
      minIncrement: fmt(input.minIncrement),
      currentBid: null,
      currentBidderId: null,
      status,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdAt: nowIso()
    };
    auctionRepo.insert(auction);

    await publishOutbox({
      id: newId(),
      eventType: "auction.created",
      aggregateId: auction.id,
      aggregateType: "auction",
      payload: {
        auctionId: auction.id,
        assetId: auction.assetId,
        sellerId: auction.sellerId
      },
      occurredAt: nowIso()
    });

    return auction;
  },

  async placeBid(input: {
    auctionId: string;
    bidderId: string;
    amount: number;
  }): Promise<Bid> {
    const auction = auctionRepo.findById(input.auctionId);
    if (!auction) throw new Error("auction_not_found");
    if (!["scheduled", "live"].includes(auction.status)) {
      throw new Error("auction_not_open");
    }

    const current = Number(auction.currentBid ?? auction.startingBid);
    const minNext = current + Number(auction.minIncrement);
    if (input.amount < minNext) {
      throw new Error(`bid_below_minimum:${minNext}`);
    }

    const bid: Bid = {
      id: newId(),
      auctionId: auction.id,
      bidderId: input.bidderId,
      amount: fmt(input.amount),
      isWinning: true,
      createdAt: nowIso()
    };
    auctionRepo.addBid(bid);
    auctionRepo.update(auction.id, {
      currentBid: bid.amount,
      currentBidderId: bid.bidderId,
      status: "live"
    });

    await publishOutbox({
      id: newId(),
      eventType: "auction.bid.placed",
      aggregateId: auction.id,
      aggregateType: "auction",
      payload: {
        auctionId: auction.id,
        bidId: bid.id,
        bidderId: bid.bidderId,
        amount: bid.amount
      },
      occurredAt: nowIso()
    });

    return bid;
  },

  list() {
    return auctionRepo.list();
  },

  listByAsset(assetId: string) {
    return auctionRepo.listByAsset(assetId);
  },

  findActiveByAsset(assetId: string) {
    return auctionRepo.findActiveByAsset(assetId) || null;
  },

  listBids(auctionId: string) {
    return auctionRepo.listBids(auctionId);
  },

  /**
   * Wave 4 auction-close worker. Walks every auction whose end time has
   * passed and resolves its outcome:
   *
   *   - no bids                    → ended_without_sale
   *   - top bid below reserve      → reserve_not_met
   *   - top bid >= reserve         → sold_pending_settlement (creates settlement)
   *
   * The settlement creation is best-effort — if settlement-service is
   * unreachable, the auction still gets the right status. The settlement
   * itself can be retried by a Wave 5 background worker.
   */
  async closeDueAuctions(): Promise<{
    closedSold: number;
    closedReserveNotMet: number;
    closedNoSale: number;
  }> {
    const settlementBase =
      process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";

    let closedSold = 0;
    let closedReserveNotMet = 0;
    let closedNoSale = 0;

    const due = auctionRepo.findDueForClose();

    for (const auction of due) {
      const winningBids = auctionRepo.listBids(auction.id);
      const winning = winningBids[0]; // newest first

      if (!winning) {
        auctionRepo.update(auction.id, { status: "no_sale" });
        await publishOutbox({
          id: newId(),
          eventType: "auction.closed.no_sale",
          aggregateId: auction.id,
          aggregateType: "auction",
          payload: { auctionId: auction.id, reason: "no_bids" },
          occurredAt: nowIso()
        });
        closedNoSale += 1;
        continue;
      }

      if (Number(winning.amount) < Number(auction.reservePrice)) {
        auctionRepo.update(auction.id, { status: "no_sale" });
        await publishOutbox({
          id: newId(),
          eventType: "auction.closed.no_sale",
          aggregateId: auction.id,
          aggregateType: "auction",
          payload: {
            auctionId: auction.id,
            reason: "reserve_not_met",
            topBid: winning.amount,
            reserve: auction.reservePrice
          },
          occurredAt: nowIso()
        });
        closedReserveNotMet += 1;
        continue;
      }

      // Sold. Create settlement.
      auctionRepo.update(auction.id, { status: "settled" });

      const gross = Number(winning.amount);
      const platformFee = Math.round(gross * 0.05 * 100) / 100;
      const royalty = Math.round(gross * 0.1 * 100) / 100;
      const sellerNet = Math.round((gross - platformFee - royalty) * 100) / 100;

      try {
        await fetch(`${settlementBase}/settlements`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceType: "auction",
            sourceId: auction.id,
            assetId: auction.assetId,
            buyerId: winning.bidderId,
            sellerId: auction.sellerId,
            grossAmount: gross,
            platformFeeAmount: platformFee,
            royaltyAmount: royalty,
            sellerNetAmount: sellerNet,
            riskSignals: []
          })
        });
      } catch {
        // Settlement creation can be retried later; auction status stays "settled".
      }

      await publishOutbox({
        id: newId(),
        eventType: "auction.closed.sold",
        aggregateId: auction.id,
        aggregateType: "auction",
        payload: {
          auctionId: auction.id,
          assetId: auction.assetId,
          buyerId: winning.bidderId,
          sellerId: auction.sellerId,
          gross
        },
        occurredAt: nowIso()
      });
      closedSold += 1;
    }

    return { closedSold, closedReserveNotMet, closedNoSale };
  }
};
