export default function HomePage() {
  return (
    <main style={{ padding: 64, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 48, marginBottom: 16 }}>Every collectible has a story.</h1>
      <p style={{ color: "#cbceea", fontSize: 18, lineHeight: 1.6, maxWidth: 640 }}>
        CrownX Jewel attaches authenticated provenance to memorabilia, art, and NIL
        rights — so every collectible carries proof of its origin, its custody, and the
        people whose work it represents.
      </p>
      <p style={{ color: "#9ea2bd", marginTop: 24 }}>
        Story pages live at <code>/collectible/&lt;slug&gt;</code>. Creator pages live at{" "}
        <code>/creator/&lt;handle&gt;</code>.
      </p>
    </main>
  );
}
