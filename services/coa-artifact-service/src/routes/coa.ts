import type { FastifyInstance } from "fastify";
import { coaArtifactStore } from "../domain/coa-artifact.service";

export function registerCoaArtifactRoutes(app: FastifyInstance) {
  // market / feed gallery of viewable Genesis COAs
  app.get("/coa-artifact", async (request) => {
    const { limit } = request.query as { limit?: string };
    return { artifacts: coaArtifactStore.list(limit ? Number(limit) : 24), stats: coaArtifactStore.stats() };
  });

  // full artifact (dual-pane 3D/4D + layers + anchors) for the viewer
  app.get("/coa-artifact/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = coaArtifactStore.get(id);
    if (!a) return reply.code(404).send({ error: "coa_not_found" });
    return a;
  });

  // derived 3D/4D depth-layer stack
  app.get("/coa-artifact/:id/layers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const l = coaArtifactStore.layers(id);
    if (!l) return reply.code(404).send({ error: "coa_not_found" });
    return { layers: l };
  });

  // issue a Genesis COA artifact (called by the minting engine)
  app.post("/coa-artifact", async (request, reply) => {
    const b = (request.body || {}) as Record<string, unknown>;
    if (!b.tokenId || !b.coaNumber || !b.title || !b.ownerUserId || !b.fingerprintHash || !b.sessionDna || !b.anchorTxRef) {
      return reply.code(400).send({ error: "missing_required_coa_fields" });
    }
    return reply.code(201).send(coaArtifactStore.issue(b as never));
  });

  // §3 unlock a gamified layer (owner/wallet-gated) → tamper-proof record
  app.post("/coa-artifact/:id/unlock", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { layerId?: string; wallet?: string; userId?: string };
    if (!b.layerId) return reply.code(400).send({ error: "layerId_required" });
    const r = coaArtifactStore.unlock(id, b.layerId, { wallet: b.wallet || "0xself", userId: b.userId || "" });
    if ("error" in r) return reply.code(r.error === "coa_not_found" ? 404 : 403).send(r);
    return r;
  });

  // §2 open an immersive AR/VR (WebXR) session — Meta Quest, AR glasses, headsets
  app.post("/coa-artifact/:id/xr-session", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { mode?: string; device?: string; userId?: string };
    const r = coaArtifactStore.openXrSession(id, b);
    if ("error" in r) return reply.code(r.error === "coa_not_found" ? 404 : 409).send(r);
    return r;
  });

  // §2 log a gesture/command inside an XR session
  app.post("/coa-artifact/xr/:sessionId/gesture", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const b = (request.body || {}) as { gesture?: string };
    const r = coaArtifactStore.logGesture(sessionId, b.gesture || "select");
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  // §3 re-seal owner-gated layers on resale/transfer
  app.post("/coa-artifact/:id/transfer", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { newOwnerUserId?: string };
    if (!b.newOwnerUserId) return reply.code(400).send({ error: "newOwnerUserId_required" });
    const r = coaArtifactStore.transfer(id, b.newOwnerUserId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
}
