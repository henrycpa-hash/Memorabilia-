/**
 * Wave 5 shipping/logistics abstractions.
 *
 * Carrier adapters generate labels and ingest tracking events. Wave 5 ships
 * a mock that produces deterministic tracking numbers and synthetic events;
 * Wave 6 plugs in real EasyPost/Shippo/UPS/FedEx adapters.
 */
export type Carrier = "ups" | "fedex" | "usps" | "dhl" | "vault_courier" | "mock";

export type ShipmentStatus =
  | "draft"
  | "label_created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_exception"
  | "lost"
  | "returned";

export type DeliveryMode = "standard" | "signature_required" | "vault_handoff";

export type TrackingEventType =
  | "label_created"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "lost";

export type TrackingEvent = {
  eventType: TrackingEventType;
  description: string;
  occurredAt: string;
  location?: string;
};

export interface CarrierAdapter {
  createLabel(input: {
    fromAddress: string;
    toAddress: string;
    weightOz: number;
    declaredValue: number;
    deliveryMode: DeliveryMode;
  }): Promise<{
    trackingNumber: string;
    labelUrl: string;
    carrier: Carrier;
  }>;

  getTrackingEvents(trackingNumber: string): Promise<TrackingEvent[]>;
}

/** Mock carrier — deterministic-looking tracking numbers + synthetic events. */
export const mockCarrierAdapter: CarrierAdapter = {
  async createLabel(input) {
    const id = Math.random().toString(36).slice(2, 12).toUpperCase();
    return {
      trackingNumber: `MOCK${id}`,
      labelUrl: `/labels/MOCK${id}.pdf`,
      carrier: "mock"
    };
  },
  async getTrackingEvents(trackingNumber) {
    // Wave 5 returns a single synthetic in-transit event; Wave 6 polls real APIs.
    return [
      {
        eventType: "label_created",
        description: `Label ${trackingNumber} created`,
        occurredAt: new Date().toISOString()
      }
    ];
  }
};

export function pickCarrierAdapter(carrier: Carrier): CarrierAdapter {
  // Wave 5 always returns mock; Wave 6 dispatches by carrier name.
  return mockCarrierAdapter;
}
