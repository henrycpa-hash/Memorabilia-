import Link from "next/link";
import { publicGet } from "../../lib/api";

type Auction = {
  id: string;
  assetId: string;
  status: string;
  reservePrice: string;
  startingBid: string;
  currentBid: string | null;
  minIncrement: string;
  endsAt: string;
};

export default async function AuctionsPage() {
  const auctions = await publicGet<Auction[]>("/api/auctions");
  const visible = (auctions || []).filter((a) =>
    ["scheduled", "live"].includes(a.status)
  );

  return (
    <section>
      <h1>Auctions</h1>
      <p style={{ color: "#a4adcb" }}>
        Live and scheduled auctions. Click in to place a bid.
      </p>

      {visible.length === 0 ? (
        <p style={{ color: "#7d83a3", marginTop: 24 }}>No active auctions.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 24
          }}
        >
          {visible.map((a) => (
            <Link
              key={a.id}
              href={`/auctions/${a.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#11141f",
                border: "1px solid #1f2433",
                borderRadius: 12,
                padding: 16,
                display: "block"
              }}
            >
              <div style={{ fontSize: 13, color: "#7d83a3" }}>Auction</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                <code>{a.assetId.slice(0, 12)}…</code>
              </div>
              <div style={{ fontSize: 24, marginTop: 12 }}>
                ${Number(a.currentBid ?? a.startingBid).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: "#a4adcb", marginTop: 6 }}>
                reserve ${Number(a.reservePrice).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "#7d83a3", marginTop: 8 }}>
                ends: {new Date(a.endsAt).toLocaleString()}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "inline-block",
                  padding: "2px 8px",
                  background: a.status === "live" ? "#0a8043" : "#324",
                  borderRadius: 999,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1
                }}
              >
                {a.status}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
