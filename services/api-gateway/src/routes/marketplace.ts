import type { FastifyInstance } from "fastify";

const marketBase = () => process.env.MARKET_SERVICE_URL || "http://localhost:4005";
const assetBase = () => process.env.ASSET_SERVICE_URL || "http://localhost:4002";
const ledgerBase = () => process.env.LEDGER_SERVICE_URL || "http://localhost:4012";
const rankingBase = () => process.env.RANKING_SERVICE_URL || "http://localhost:4013";
const auditBase = () => process.env.AUDIT_SERVICE_URL || "http://localhost:4014";
const notifBase = () => process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008";
const royaltyBase = () => process.env.ROYALTY_SERVICE_URL || "http://localhost:4006";
const settlementBase = () => process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";
const renderBase = () => process.env.RENDER_SERVICE_URL || "http://localhost:4019";
const warehouseBase = () => process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4020";
const automationBase = () => process.env.AUTOMATION_SERVICE_URL || "http://localhost:4021";
const paymentBase = () => process.env.PAYMENT_SERVICE_URL || "http://localhost:4022";
const shippingBase = () => process.env.SHIPPING_SERVICE_URL || "http://localhost:4023";
const insuranceBase = () => process.env.INSURANCE_SERVICE_URL || "http://localhost:4024";
const storyBase = () =>
  process.env.NEXT_PUBLIC_PUBLIC_STORY_URL ||
  process.env.PUBLIC_STORY_URL ||
  "http://localhost:3004";

const HIGH_VALUE_INSURANCE_THRESHOLD = 1000;

type RoyaltyRule = {
  id: string;
  beneficiaries: Array<{ beneficiaryId: string; percentage: number }>;
};

type Order = {
  id: string;
  listingId: string;
  assetId: string;
  buyerId: string;
  sellerId: string;
  grossAmount: number;
  royaltyAmount: number;
  netToSeller: number;
  status: string;
};

type PaymentIntent = {
  id: string;
  status: string;
  providerIntentId: string;
  amount: string;
};

type Settlement = {
  id: string;
  settlementState: string;
  escrowState: string;
  riskBand: string | null;
  holdReason: string | null;
};

type Logger = { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };

async function runReleasedFanOut(order: Order, settlement: Settlement, log: Logger) {
  const platformFee = Math.round(order.grossAmount * 0.05 * 100) / 100;
  const royalty = order.royaltyAmount;
  const net = order.grossAmount - platformFee - royalty;
  const fmt = (n: number) => n.toFixed(2);

  await fetch(`${ledgerBase()}/ledger/entries`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      entries: [
        { accountId: "buyer_payment_clearing", direction: "credit", amount: fmt(order.grossAmount), referenceType: "settlement", referenceId: settlement.id, memo: "Buyer payment captured" },
        { accountId: "platform_revenue", direction: "credit", amount: fmt(platformFee), referenceType: "settlement", referenceId: settlement.id, memo: "Platform fee" },
        { accountId: "seller_payable", direction: "credit", amount: fmt(net), referenceType: "settlement", referenceId: settlement.id, memo: "Seller net payable" },
        { accountId: "royalty_payable", direction: "credit", amount: fmt(royalty), referenceType: "settlement", referenceId: settlement.id, memo: "Royalty payable" }
      ]
    })
  }).catch((err) => log.warn({ err }, "ledger post failed"));

  await fetch(`${ledgerBase()}/payouts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payeeId: order.sellerId, amount: fmt(net), referenceType: "settlement", referenceId: settlement.id })
  }).catch((err) => log.warn({ err }, "seller payout failed"));

  const royaltyRule = await fetch(`${royaltyBase()}/rules/by-asset/${order.assetId}`)
    .then((r) => (r.ok ? (r.json() as Promise<RoyaltyRule>) : null))
    .catch(() => null);

  if (royaltyRule && royalty > 0) {
    for (const b of royaltyRule.beneficiaries) {
      const slice = Math.round(royalty * (b.percentage / 100) * 100) / 100;
      if (slice <= 0) continue;
      await fetch(`${ledgerBase()}/payouts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payeeId: b.beneficiaryId, amount: fmt(slice), referenceType: "royalty", referenceId: settlement.id })
      }).catch((err) => log.warn({ err }, "royalty payout failed for " + b.beneficiaryId));
    }
  }

  await fetch(`${assetBase()}/internal/assets/${order.assetId}/transfer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newOwnerId: order.buyerId })
  }).catch((err) => log.warn({ err }, "transfer failed"));

  await fetch(`${assetBase()}/internal/assets/${order.assetId}/timeline`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "sale_completed", label: "Sale completed", price: order.grossAmount })
  }).catch((err) => log.warn({ err }, "timeline append failed"));

  const asset = await fetch(`${assetBase()}/assets/${order.assetId}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  if (asset) {
    await fetch(`${rankingBase()}/share-cards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assetId: order.assetId,
        slug: asset.slug,
        cardType: "record_sale_card",
        title: asset.title || "Sale completed",
        subtitle: `Sold for $${order.grossAmount.toLocaleString()}`,
        publicUrl: `${storyBase()}/collectible/${asset.slug}`
      })
    }).catch((err) => log.warn({ err }, "share card failed"));

    await fetch(`${renderBase()}/render/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assetId: order.assetId,
        templateKey: "record_sale_card",
        payload: { slug: asset.slug, title: asset.title, gross: order.grossAmount, settlementId: settlement.id }
      })
    }).catch((err) => log.warn({ err }, "render enqueue failed"));
  }

  await fetch(`${rankingBase()}/trending/signals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId: order.assetId, signal: "sale" })
  }).catch((err) => log.warn({ err }, "ranking sale signal failed"));

  await Promise.all([
    fetch(`${notifBase()}/notifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: order.buyerId,
        type: "purchase_completed",
        title: "Your purchase is complete",
        body: `Settlement ${settlement.id} for $${order.grossAmount.toLocaleString()} settled.`
      })
    }),
    fetch(`${notifBase()}/notifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: order.sellerId,
        type: "sale_completed",
        title: "Your collectible sold",
        body: `Settlement ${settlement.id}: $${fmt(net)} is queued for payout.`
      })
    })
  ]).catch((err) => log.warn({ err }, "notifications failed"));

  await fetch(`${auditBase()}/audit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actorId: order.buyerId,
      actorRole: "fan",
      actionType: "settlement.complete",
      aggregateType: "settlement",
      aggregateId: settlement.id,
      payloadJson: { gross: order.grossAmount, net, platformFee, royalty, assetId: order.assetId, orderId: order.id }
    })
  }).catch((err) => log.warn({ err }, "audit append failed"));

  await fetch(`${automationBase()}/automation/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventType: "settlement.completed",
      payload: { settlementId: settlement.id, buyerId: order.buyerId, sellerId: order.sellerId, title: "Settlement completed", body: `Sale of $${order.grossAmount.toLocaleString()} settled.` }
    })
  }).catch((err) => log.warn({ err }, "automation trigger failed"));

  log.info({ settlementId: settlement.id }, "wave5 released-settlement fanout complete");
}

async function runHeldFanOut(order: Order, settlement: Settlement, log: Logger) {
  await fetch(`${notifBase()}/notifications`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: order.buyerId,
      type: "settlement_held",
      title: "Your settlement is on hold",
      body: `Settlement ${settlement.id} is on hold pending review (${settlement.holdReason || "risk review"}). Funds remain in escrow.`
    })
  }).catch((err) => log.warn({ err }, "held notify failed"));

  await fetch(`${auditBase()}/audit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actorId: order.buyerId,
      actorRole: "system",
      actionType: "settlement.held",
      aggregateType: "settlement",
      aggregateId: settlement.id,
      payloadJson: { reason: settlement.holdReason, riskBand: settlement.riskBand, orderId: order.id, assetId: order.assetId }
    })
  }).catch((err) => log.warn({ err }, "held audit failed"));
}

async function emitWarehouseFacts(order: Order, settlement: Settlement, log: Logger) {
  await fetch(`${warehouseBase()}/warehouse/facts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType: "sale_completed", assetId: order.assetId, amount: order.grossAmount, userId: order.buyerId, sourceId: settlement.id })
  }).catch((err) => log.warn({ err }, "warehouse sale fact failed"));

  if (settlement.settlementState === "on_hold") {
    await fetch(`${warehouseBase()}/warehouse/facts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType: "settlement_held", assetId: order.assetId, userId: order.buyerId, sourceId: settlement.id })
    }).catch((err) => log.warn({ err }, "warehouse held fact failed"));
  }
}

/**
 * Wave 5 logistics fan-out: best-effort shipment label + (high-value) policy bind.
 * Skipped entirely when shipment data wasn't supplied at checkout.
 */
async function runLogisticsFanOut(
  order: Order,
  settlement: Settlement,
  shipping: { fromAddress?: string; toAddress?: string; weightOz?: number; deliveryMode?: string } | undefined,
  log: Logger
) {
  if (!shipping || !shipping.fromAddress || !shipping.toAddress) return;

  // Create shipment + label
  const shipmentResp = await fetch(`${shippingBase()}/shipments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      settlementId: settlement.id,
      assetId: order.assetId,
      fromAddress: shipping.fromAddress,
      toAddress: shipping.toAddress,
      weightOz: shipping.weightOz || 16,
      declaredValue: order.grossAmount,
      deliveryMode: shipping.deliveryMode || "standard"
    })
  }).catch((err) => {
    log.warn({ err }, "shipment create failed");
    return null;
  });

  // Bind insurance for high-value items
  if (order.grossAmount >= HIGH_VALUE_INSURANCE_THRESHOLD) {
    const shipmentId = shipmentResp && shipmentResp.ok ? (await shipmentResp.json()).id : undefined;
    await fetch(`${insuranceBase()}/insurance/policies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shipmentId,
        assetId: order.assetId,
        insuredAmount: order.grossAmount,
        description: `Auto-bound on settlement ${settlement.id}`
      })
    }).catch((err) => log.warn({ err }, "insurance policy bind failed"));
  }
}

export function registerMarketplaceRoutes(app: FastifyInstance) {
  /**
   * Wave 5 checkout flow.
   *
   *   1. marketplace-service POST /checkout                       → durable order + royalty calc
   *   2. payment-integration-service POST /payments/intents       → create payment intent
   *   3. payment-integration-service POST /intents/:id/capture    → capture payment immediately
   *   4. settlement-service POST /settlements                     → escrow + risk-aware initial state
   *   5. branch on settlement.settlementState:
   *        on_hold       → notification + audit only
   *        ready_for_release → full fan-out (ledger / payouts / transfer / share-cards / etc.)
   *   6. fire-and-forget post-settlement logistics if shipping info supplied:
   *        shipping-logistics-service POST /shipments
   *        insurance-claims-service  POST /insurance/policies (high-value only)
   *   7. ALWAYS emit warehouse facts
   *
   * Errors in any post-order step are logged but never fail the response.
   */
  app.post("/api/checkout", async (request, reply) => {
    const body = (request.body || {}) as Record<string, unknown>;

    // 1. Order
    const orderResp = await fetch(`${marketBase()}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId: body.listingId, buyerId: body.buyerId })
    });
    if (!orderResp.ok) {
      return reply.code(orderResp.status).send(await orderResp.json());
    }
    const order = (await orderResp.json()) as Order;

    const platformFee = Math.round(order.grossAmount * 0.05 * 100) / 100;
    const royalty = order.royaltyAmount;
    const sellerNet = order.grossAmount - platformFee - royalty;

    // 2 + 3. Payment intent + capture (best-effort — Wave 5 mock adapter never fails)
    let paymentIntent: PaymentIntent | null = null;
    try {
      const intentResp = await fetch(`${paymentBase()}/payments/intents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          settlementId: order.id, // settlementId not yet known — link by orderId for now, settlement service stores order ref
          amount: order.grossAmount,
          currency: "USD",
          provider: (body.paymentProvider as string) || "mock",
          paymentMethodType: (body.paymentMethodType as string) || "card",
          metadata: { orderId: order.id, buyerId: order.buyerId }
        })
      });
      if (intentResp.ok) {
        paymentIntent = (await intentResp.json()) as PaymentIntent;
        // Auto-capture
        const capResp = await fetch(
          `${paymentBase()}/payments/intents/${paymentIntent.id}/capture`,
          { method: "POST" }
        );
        if (capResp.ok) {
          paymentIntent = (await capResp.json()) as PaymentIntent;
        }
      }
    } catch (err) {
      request.log.warn({ err }, "payment intent + capture failed");
    }

    // 4. Settlement
    let settlement: Settlement | null = null;
    try {
      const sResp = await fetch(`${settlementBase()}/settlements`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType: "order",
          sourceId: order.id,
          assetId: order.assetId,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          grossAmount: order.grossAmount,
          platformFeeAmount: platformFee,
          royaltyAmount: royalty,
          sellerNetAmount: sellerNet,
          riskSignals: (body.riskSignals as string[]) || []
        })
      });
      if (sResp.ok) settlement = (await sResp.json()) as Settlement;
    } catch (err) {
      request.log.warn({ err }, "settlement creation failed");
    }

    // 5 + 6 + 7
    if (settlement) {
      const fanOut =
        settlement.settlementState === "on_hold"
          ? runHeldFanOut(order, settlement, request.log)
          : runReleasedFanOut(order, settlement, request.log);

      fanOut
        .then(() => emitWarehouseFacts(order, settlement!, request.log))
        .then(() =>
          settlement!.settlementState !== "on_hold"
            ? runLogisticsFanOut(
                order,
                settlement!,
                body.shipping as
                  | { fromAddress?: string; toAddress?: string; weightOz?: number; deliveryMode?: string }
                  | undefined,
                request.log
              )
            : undefined
        )
        .catch((err) => request.log.warn({ err }, "fanOut failed"));
    } else {
      fetch(`${warehouseBase()}/warehouse/facts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventType: "sale_completed", assetId: order.assetId, amount: order.grossAmount, userId: order.buyerId, sourceId: order.id })
      }).catch(() => undefined);
    }

    reply.code(201).send({ order, paymentIntent, settlement });
  });

  app.get("/api/orders", async (_request, reply) => {
    const response = await fetch(`${marketBase()}/orders`);
    reply.code(response.status).send(await response.json());
  });
}
