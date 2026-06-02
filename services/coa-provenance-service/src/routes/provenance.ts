import type { FastifyInstance } from "fastify";
import { coaService } from "../domain/coa.service";

/**
 * Wave 1: provenance timeline is a thin read model derived from the COA record.
 * Wave 3 will introduce a dedicated public-safe ownership timeline projection
 * (asset_registered, evidence_uploaded, auth_approved, coa_issued, listing_created,
 *  sale_completed, ownership_transferred).
 */
export function registerProvenanceRoutes(app: FastifyInstance) {
  app.get("/provenance/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const coa = coaService.findByAssetId(assetId);
    if (!coa) return reply.code(404).send({ error: "not_found" });
    return {
      assetId,
      coa,
      timeline: [
        {
          type: "coa_issued",
          at: coa.createdAt,
          label: `COA ${coa.coaNumber} issued`
        }
      ]
    };
  });
}
