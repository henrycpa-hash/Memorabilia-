export type AuctionStatus = "scheduled" | "live" | "closed" | "settled" | "no_sale";

export type Auction = {
  id: string;
  assetId: string;
  sellerId: string;
  reservePrice: string;
  startingBid: string;
  minIncrement: string;
  currentBid: string | null;
  currentBidderId: string | null;
  status: AuctionStatus;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type Bid = {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: string;
  isWinning: boolean;
  createdAt: string;
};

const auctions: Auction[] = [];
const bids: Bid[] = [];

export const auctionRepo = {
  insert(a: Auction) {
    auctions.push(a);
    return a;
  },
  findById(id: string) {
    return auctions.find((a) => a.id === id) || null;
  },
  list() {
    return [...auctions];
  },
  listByAsset(assetId: string) {
    return auctions.filter((a) => a.assetId === assetId);
  },
  findActiveByAsset(assetId: string) {
    return auctions.find(
      (a) => a.assetId === assetId && (a.status === "scheduled" || a.status === "live")
    );
  },
  update(id: string, patch: Partial<Auction>) {
    const a = auctions.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
    return a || null;
  },

  addBid(b: Bid) {
    // mark previous winning bid for this auction as not-winning
    for (const x of bids) {
      if (x.auctionId === b.auctionId && x.isWinning) x.isWinning = false;
    }
    bids.push(b);
    return b;
  },
  listBids(auctionId: string) {
    return bids
      .filter((b) => b.auctionId === auctionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  countBids(auctionId: string) {
    return bids.filter((b) => b.auctionId === auctionId).length;
  },
  findDueForClose(asOf: Date = new Date()) {
    return auctions.filter(
      (a) =>
        (a.status === "scheduled" || a.status === "live") &&
        new Date(a.endsAt).getTime() <= asOf.getTime()
    );
  }
};
