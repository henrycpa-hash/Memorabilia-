import { publicGet } from "../../../lib/api";
import OfferAndWatchClient from "./offer-watch-client";

type Listing = {
  id: string;
  assetId: string;
  sellerId: string;
  price: string;
  status: string;
};

export default async function ListingDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const all = await publicGet<Listing[]>("/api/listings");
  const listing = (all || []).find((l) => l.id === id);

  if (!listing) {
    return (
      <section>
        <h1>Listing not found</h1>
        <p style={{ color: "#7d83a3" }}>
          The listing <code>{id}</code> doesn&apos;t exist or has been removed.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ marginBottom: 8 }}>Listing</h1>
      <div style={{ color: "#7d83a3", fontSize: 13 }}>id: <code>{listing.id}</code></div>
      <div style={{ color: "#7d83a3", fontSize: 13 }}>
        asset: <code>{listing.assetId}</code>
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
        <div style={{ color: "#a4adcb", fontSize: 13 }}>Asking price</div>
        <div style={{ fontSize: 36, fontWeight: 600, marginTop: 4 }}>
          ${Number(listing.price).toLocaleString()}
        </div>
        <div style={{ marginTop: 6, color: "#7eebc1", fontSize: 13 }}>{listing.status}</div>
      </div>

      <OfferAndWatchClient
        assetId={listing.assetId}
        listingId={listing.id}
        sellerId={listing.sellerId}
      />
    </section>
  );
}
