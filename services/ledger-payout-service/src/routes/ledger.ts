import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { LEDGER_ACCOUNT_IDS } from "@crownx-jewel/shared-ledger";
import { ledgerService } from "../domain/ledger.service";

const postSchema = z.object({
  entries: z
    .array(
      z.object({
        accountId: z.string(),
        direction: z.enum(["debit", "credit"]),
        amount: z.string(),
        referenceType: z.string(),
        referenceId: z.string(),
        memo: z.string()
      })
    )
    .min(1)
});

export function registerLedgerRoutes(app: FastifyInstance) {
  // Internal: posted to by marketplace-service on order completion. Wave 4
  // moves this behind an inter-service token; Wave 3 leaves it open so the
  // gateway can also debug-post.
  app.post("/ledger/entries", async (request, reply) => {
    const input = postSchema.parse(request.body);

    // Validate account ids against the catalog. Unknown ids are rejected so
    // the ledger only contains canonical balances.
    for (const e of input.entries) {
      if (!LEDGER_ACCOUNT_IDS.includes(e.accountId as never)) {
        return reply.code(400).send({
          error: "unknown_account",
          accountId: e.accountId,
          known: LEDGER_ACCOUNT_IDS
        });
      }
    }

    // Cast is safe because we just validated each accountId against the catalog.
    const rows = await ledgerService.postEntries(input.entries as never);
    reply.code(201).send(rows);
  });

  app.get("/ledger/entries", async () => ledgerService.listEntries());

  app.get(
    "/ledger/entries/by-reference/:type/:id",
    async (request) => {
      const { type, id } = request.params as { type: string; id: string };
      return ledgerService.listEntriesByReference(type, id);
    }
  );

  // Admin-only balance read.
  app.get(
    "/ledger/balance/:accountId",
    { preHandler: requireRole("admin") },
    async (request) => {
      const { accountId } = request.params as { accountId: string };
      const rows = ledgerService.listEntriesByAccount(accountId);
      const credits = rows
        .filter((r) => r.direction === "credit")
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const debits = rows
        .filter((r) => r.direction === "debit")
        .reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        accountId,
        credits: credits.toFixed(2),
        debits: debits.toFixed(2),
        net: (credits - debits).toFixed(2),
        entryCount: rows.length
      };
    }
  );
}
