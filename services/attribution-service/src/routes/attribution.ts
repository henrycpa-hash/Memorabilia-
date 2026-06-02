import type { FastifyInstance } from "fastify";
import { attributionService, type Surface } from "../domain/attribution.service";
import { buildShareCardSvg } from "../render/card";

export function registerAttributionRoutes(app: FastifyInstance) {
  // card.rendered — mint completes → mint render_id + signed share links
  app.post("/renders", async (request, reply) => {
    const b = (request.body || {}) as {
      assetId?: string;
      sharerId?: string;
      sharerLv?: number;
      surface?: Surface;
      card?: { name: string; title?: string; grade: string; edition?: string; floor?: string; lv?: string };
    };
    if (!b.assetId || !b.sharerId || !b.card?.name || !b.card?.grade) {
      return reply.code(400).send({ error: "assetId_sharerId_card_required" });
    }
    const rec = attributionService.createRender({ assetId: b.assetId, sharerId: b.sharerId, sharerLv: b.sharerLv, surface: b.surface, card: b.card });
    reply.code(201).send({
      renderId: rec.renderId,
      sig: rec.sig,
      rewardToken: rec.rewardToken,
      shareUrl: attributionService.shareUrl(rec.renderId),
      cardUrl: attributionService.cardUrl(rec.renderId)
    });
  });

  // the SVG share card itself (cacheable by render/asset)
  app.get("/renders/:id/card.svg", async (request, reply) => {
    const { id } = request.params as { id: string };
    const rec = attributionService.get(id);
    if (!rec) return reply.code(404).send({ error: "not_found" });
    reply.header("content-type", "image/svg+xml").header("cache-control", "public, max-age=86400").send(buildShareCardSvg(rec.card));
  });

  // edge resolver /c/:id — logs the view, returns the OG-unfurl page, deep-links in
  app.get("/c/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as { fp?: string };
    const rec = attributionService.get(id);
    if (!rec) return reply.code(404).send({ error: "not_found" });
    const ipHash = (request.headers["x-forwarded-for"] as string) || request.ip || "anon";
    const dedupe = q.fp || ipHash;
    await attributionService.logView(id, dedupe);
    const cardUrl = attributionService.cardUrl(id);
    const deep = `${process.env.APP_DEEP_LINK || "http://localhost:3003"}/login?ref=${id}`;
    reply.header("content-type", "text/html").send(
      `<!doctype html><html><head><meta charset="utf-8">
<title>CrownX Vault — ${rec.card.name}</title>
<meta property="og:title" content="${rec.card.name} · Grade ${rec.card.grade}">
<meta property="og:description" content="Minted on CrownX Vault. Royalties for life. Claim your founder pack.">
<meta property="og:image" content="${cardUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${cardUrl}">
<meta http-equiv="refresh" content="0; url=${deep}">
</head><body style="margin:0;background:#04060d"><img src="${cardUrl}" style="max-width:420px;display:block;margin:0 auto" alt="${rec.card.name}"></body></html>`
    );
  });

  // app.install — attributed install via deferred deep link (binds render_id)
  app.post("/attribution/install", async (request, reply) => {
    const b = (request.body || {}) as { deviceHash?: string; renderId?: string };
    if (!b.deviceHash) return reply.code(400).send({ error: "deviceHash_required" });
    const r = attributionService.recordInstall(b.deviceHash, b.renderId);
    reply.code(r.ok ? 200 : 404).send(r);
  });

  // resolve the deferred deep link a device was tagged with at view time
  app.get("/attribution/deferred/:deviceHash", async (request) => {
    const { deviceHash } = request.params as { deviceHash: string };
    return { renderId: attributionService.resolveDeferred(deviceHash) };
  });

  // user.activated — write the referral edge (no XP)
  app.post("/attribution/activate", async (request, reply) => {
    const b = (request.body || {}) as { renderId?: string; inviteeId?: string };
    if (!b.renderId || !b.inviteeId) return reply.code(400).send({ error: "renderId_and_inviteeId_required" });
    return attributionService.activate(b.renderId, b.inviteeId);
  });

  // mint.first — CONVERSION: release invite XP
  app.post("/attribution/first-mint", async (request, reply) => {
    const b = (request.body || {}) as { renderId?: string; inviteeId?: string; onChainRef?: string };
    if (!b.renderId || !b.inviteeId) return reply.code(400).send({ error: "renderId_and_inviteeId_required" });
    return attributionService.firstMint(b.renderId, b.inviteeId, b.onChainRef);
  });

  app.get("/attribution/metrics", async () => attributionService.metrics());
}
