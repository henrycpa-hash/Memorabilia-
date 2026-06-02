import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  pickCarrierAdapter,
  type Carrier,
  type DeliveryMode,
  type ShipmentStatus,
  type TrackingEventType
} from "@crownx-jewel/shared-logistics";
import { shippingRepo, type Shipment } from "../repo/shipping.repo";

const settlementBase = () =>
  process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";

export const shippingService = {
  async createShipment(input: {
    settlementId: string;
    assetId: string;
    fromAddress: string;
    toAddress: string;
    weightOz: number;
    declaredValue: number;
    deliveryMode: DeliveryMode;
    carrier?: Carrier;
  }): Promise<Shipment> {
    const carrier: Carrier = input.carrier || "mock";
    const adapter = pickCarrierAdapter(carrier);
    const label = await adapter.createLabel({
      fromAddress: input.fromAddress,
      toAddress: input.toAddress,
      weightOz: input.weightOz,
      declaredValue: input.declaredValue,
      deliveryMode: input.deliveryMode
    });

    const s: Shipment = {
      id: newId(),
      settlementId: input.settlementId,
      assetId: input.assetId,
      fromAddress: input.fromAddress,
      toAddress: input.toAddress,
      carrier: label.carrier,
      trackingNumber: label.trackingNumber,
      labelUrl: label.labelUrl,
      declaredValue: input.declaredValue.toFixed(2),
      weightOz: input.weightOz,
      deliveryMode: input.deliveryMode,
      status: "label_created",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deliveredAt: null
    };
    shippingRepo.insert(s);

    shippingRepo.insertEvent({
      id: newId(),
      shipmentId: s.id,
      eventType: "label_created",
      description: `Label ${s.trackingNumber} created with ${s.carrier}`,
      occurredAt: nowIso()
    });

    await publishOutbox({
      id: newId(),
      eventType: "shipping.label.created",
      aggregateId: s.id,
      aggregateType: "shipment",
      payload: { shipmentId: s.id, trackingNumber: s.trackingNumber },
      occurredAt: nowIso()
    });

    return s;
  },

  /** Manually advance a shipment's tracking status (used by tests + webhooks). */
  async ingestEvent(input: {
    shipmentId: string;
    eventType: TrackingEventType;
    description: string;
    location?: string;
  }) {
    const s = shippingRepo.findById(input.shipmentId);
    if (!s) return null;
    shippingRepo.insertEvent({
      id: newId(),
      shipmentId: s.id,
      eventType: input.eventType,
      description: input.description,
      occurredAt: nowIso(),
      location: input.location
    });

    // Map tracking event → shipment status.
    const statusMap: Record<TrackingEventType, ShipmentStatus> = {
      label_created: "label_created",
      picked_up: "in_transit",
      in_transit: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      exception: "delivery_exception",
      lost: "lost"
    };
    const newStatus = statusMap[input.eventType];
    const updated = shippingRepo.update(s.id, {
      status: newStatus,
      updatedAt: nowIso(),
      deliveredAt: input.eventType === "delivered" ? nowIso() : s.deliveredAt
    });

    await publishOutbox({
      id: newId(),
      eventType: `shipping.${input.eventType}`,
      aggregateId: s.id,
      aggregateType: "shipment",
      payload: { shipmentId: s.id, status: newStatus },
      occurredAt: nowIso()
    });

    // Wave 5 guardrail: on exception/lost, request settlement hold.
    if (input.eventType === "exception" || input.eventType === "lost") {
      try {
        await fetch(`${settlementBase()}/internal/settlements/${s.settlementId}/hold`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: `Shipment ${input.eventType}: ${s.trackingNumber}` })
        });
      } catch {
        // best-effort
      }
    }

    return updated;
  },

  list: () => shippingRepo.list(),
  findById: (id: string) => shippingRepo.findById(id),
  bySettlement: (s: string) => shippingRepo.bySettlement(s),
  events: (id: string) => shippingRepo.listEvents(id)
};
