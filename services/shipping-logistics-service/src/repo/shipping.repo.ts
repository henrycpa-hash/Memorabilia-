import type {
  Carrier,
  ShipmentStatus,
  DeliveryMode,
  TrackingEvent
} from "@crownx-jewel/shared-logistics";

export type Shipment = {
  id: string;
  settlementId: string;
  assetId: string;
  fromAddress: string;
  toAddress: string;
  carrier: Carrier;
  trackingNumber: string;
  labelUrl: string;
  declaredValue: string;
  weightOz: number;
  deliveryMode: DeliveryMode;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
};

export type ShipmentEvent = {
  id: string;
  shipmentId: string;
  eventType: TrackingEvent["eventType"];
  description: string;
  occurredAt: string;
  location?: string;
};

const shipments: Shipment[] = [];
const events: ShipmentEvent[] = [];

export const shippingRepo = {
  insert(s: Shipment) {
    shipments.push(s);
    return s;
  },
  findById(id: string) {
    return shipments.find((s) => s.id === id) || null;
  },
  list() {
    return [...shipments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  bySettlement(settlementId: string) {
    return shipments.filter((s) => s.settlementId === settlementId);
  },
  update(id: string, patch: Partial<Shipment>) {
    const s = shipments.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    return s || null;
  },

  insertEvent(e: ShipmentEvent) {
    events.push(e);
    return e;
  },
  listEvents(shipmentId: string) {
    return events
      .filter((e) => e.shipmentId === shipmentId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }
};
