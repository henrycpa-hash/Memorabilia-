import { publicGet } from "../../../lib/api";

type StoryResponse = {
  asset: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    assetType: string;
    authenticityStatus: string;
    editionType?: string;
    currentOwnerId?: string;
  };
  coa: {
    coaNumber: string;
    manifestHash: string;
    status: string;
    createdAt: string;
  } | null;
  royaltyEnabled: boolean;
  story: {
    headline: string;
    origin: string;
    trustState: string;
    publicUrl: string;
  };
};

export default async function CollectibleStoryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicGet<StoryResponse>(`/api/public/story/${slug}`);

  if (!data) {
    return (
      <main style={{ padding: 64, maxWidth: 880, margin: "0 auto" }}>
        <h1>Not found</h1>
        <p style={{ color: "#9ea2bd" }}>
          We couldn&apos;t find a public story for <code>{slug}</code>. The collectible
          may not yet be authenticated, or the slug may have changed.
        </p>
      </main>
    );
  }

  const { asset, coa, royaltyEnabled } = data;

  return (
    <main style={{ padding: 48, maxWidth: 880, margin: "0 auto" }}>
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          background: asset.authenticityStatus === "approved" ? "#0a8043" : "#a86b00",
          borderRadius: 999,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 12
        }}
      >
        {asset.authenticityStatus === "approved" ? "Authenticated" : asset.authenticityStatus}
      </div>

      <h1 style={{ fontSize: 44, lineHeight: 1.1, marginBottom: 12 }}>{asset.title}</h1>
      {asset.description && (
        <p style={{ color: "#cbceea", fontSize: 18, lineHeight: 1.6 }}>{asset.description}</p>
      )}

      <section style={card}>
        <h2 style={h2}>Provenance</h2>
        <Row label="Type" value={asset.assetType} />
        <Row label="Edition" value={asset.editionType || "n/a"} />
        <Row label="Trust state" value={asset.authenticityStatus} />
      </section>

      {coa && (
        <section style={card}>
          <h2 style={h2}>Certificate of Authenticity</h2>
          <Row label="COA number" value={coa.coaNumber} />
          <Row
            label="Manifest hash"
            value={coa.manifestHash.slice(0, 32) + "…"}
            mono
          />
          <Row label="Status" value={coa.status} />
          <Row label="Issued" value={new Date(coa.createdAt).toLocaleString()} />
        </section>
      )}

      <section style={card}>
        <h2 style={h2}>Royalties</h2>
        <p style={{ color: "#cbceea" }}>
          {royaltyEnabled
            ? "Resale royalties are enabled. The originator earns on every secondary sale."
            : "No royalty rule has been registered for this collectible yet."}
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Origin Story</h2>
        <p style={{ color: "#cbceea", lineHeight: 1.6 }}>
          This authenticated collectible is part of the CrownX Jewel trust and provenance
          network. Every state change — from registration through authentication, COA
          issuance, listing, sale, and ownership transfer — is captured as a verifiable
          event.
        </p>
      </section>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <span style={{ color: "#9ea2bd" }}>{label}</span>
      <span
        style={{
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, monospace"
            : undefined
        }}
      >
        {value}
      </span>
    </div>
  );
}

const card: React.CSSProperties = {
  marginTop: 32,
  padding: 24,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16
};

const h2: React.CSSProperties = {
  fontSize: 18,
  marginTop: 0,
  marginBottom: 16,
  color: "#9ea2bd",
  textTransform: "uppercase",
  letterSpacing: 1
};
