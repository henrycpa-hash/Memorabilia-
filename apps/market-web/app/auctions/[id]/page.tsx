import { publicGet } from "../../../lib/api";
import BidClient from "./bid-client";

type Auction = {
  id: string;
  assetId: string;
  sellerId: string;
  status: string;
  reservePrice: string;
  startingBid: string;
  currentBid: string | null;
  currentBidderId: string | null;
  minIncrement: string;
  startsAt: string;
  endsAt: string;
};

type Bid = {
  id: string;
  bidderId: string;
  amount: string;
  createdAt: string;
  isWinning: boolean;
};

export default async function AuctionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auction = await publicGet<Auction>(`/api/auctions/${id}`);
  if (!auction) {
    return (
      <section>
        <h1>Auction not found</h1>
        <p style={{ color: "#7d83a3" }}>
          The auction <code>{id}</code> doesn&apos;t exist or has been removed.
        </p>
      </section>
    );
  }

  const bids = (await publicGet<Bid[]>(`/api/auctions/${id}/bids`)) || [];
  const watchers = await publicGet<{ count: number }>(
    `/api/watchlists/count/${auction.assetId}`
  );

  const current = Number(auction.currentBid ?? auction.startingBid);
  const minNext = current + Number(auction.minIncrement);
  const reserveMet = current >= Number(auction.reservePrice);

  return (
    <section>
      <h1 style={{ marginBottom: 8 }}>Auction</h1>
      <div style={{ color: "#7d83a3", fontSize: 13 }}>
        asset: <code>{auction.assetId}</code>
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 24,
          background: "#11141f",
          border: "1px solid #1f2433",
          borderRadius: 12
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#a4adcb", fontSize: 13 }}>Current bid</div>
            <div style={{ fontSize: 36, fontWeight: 600 }}>
              ${current.toLocaleString()}
            </div>
            <div style={{ marginTop: 4, color: reserveMet ? "#7eebc1" : "#ffb145" }}>
              {reserveMet ? "Reserve met" : "Reserve not met"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#a4adcb", fontSize: 13 }}>Watchers</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>
              {watchers?.count ?? 0}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, color: "#7d83a3", fontSize: 13 }}>
          Min next bid: ${minNext.toLocaleString()} · Ends:{" "}
          {new Date(auction.endsAt).toLocaleString()}
        </div>
      </div>

      <BidClient auctionId={auction.id} minNext={minNext} status={auction.status} />

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18 }}>Bid history</h2>
        {bids.length === 0 ? (
          <p style={{ color: "#7d83a3" }}>No bids yet.</p>
        ) : (
          <ul style={{ padding: 0, listStyle: "none" }}>
            {bids.map((b) => (
              <li
                key={b.id}
                style={{
                  padding: 12,
                  background: b.isWinning ? "#0d2a3a" : "#11141f",
                  border: "1px solid #1f2433",
                  borderRadius: 8,
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <code style={{ color: "#cdd2ec" }}>{b.bidderId.slice(0, 12)}…</code>
                  <div style={{ fontSize: 12, color: "#7d83a3" }}>
                    {new Date(b.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>${Number(b.amount).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
