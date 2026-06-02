/**
 * Wave 5 payment processor abstractions.
 *
 * Each adapter implements PaymentIntentAdapter; the payment-integration-service
 * picks the right adapter via PaymentProvider. Wave 5 ships only the mock
 * adapter (deterministic IDs, no real network calls); Wave 6 swaps in the
 * real Stripe + Adyen + manual_wire SDK calls.
 */
export type PaymentProvider = "stripe" | "adyen" | "mock";

export type PaymentIntentStatus =
  | "requires_payment_method"
  | "requires_capture"
  | "processing"
  | "succeeded"
  | "canceled"
  | "failed"
  | "refunded";

export type PayoutStatus = "submitted" | "pending" | "paid" | "failed";

export interface PaymentIntentAdapter {
  createIntent(input: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<{
    providerIntentId: string;
    status: PaymentIntentStatus;
    clientSecret?: string;
  }>;

  captureIntent(input: {
    providerIntentId: string;
  }): Promise<{ status: PaymentIntentStatus }>;

  refundIntent(input: {
    providerIntentId: string;
    amount?: number;
  }): Promise<{ status: PaymentIntentStatus }>;

  voidIntent(input: {
    providerIntentId: string;
  }): Promise<{ status: PaymentIntentStatus }>;
}

export interface PayoutAdapter {
  initiatePayout(input: {
    destinationRef: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ providerPayoutId: string; status: PayoutStatus }>;
}

/** Mock adapter — deterministic IDs, never fails. Wave 5 default. */
export const mockPaymentAdapter: PaymentIntentAdapter = {
  async createIntent(input) {
    return {
      providerIntentId: `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "requires_capture",
      clientSecret: `secret_mock_${Date.now()}`
    };
  },
  async captureIntent() {
    return { status: "succeeded" };
  },
  async refundIntent() {
    return { status: "refunded" };
  },
  async voidIntent() {
    return { status: "canceled" };
  }
};

export const mockPayoutAdapter: PayoutAdapter = {
  async initiatePayout(input) {
    return {
      providerPayoutId: `po_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "submitted"
    };
  }
};

/**
 * Wave 5 adapter selector — picks an adapter for a given provider name. The
 * stripe + adyen adapters in Wave 5 just delegate to mock so the request shape
 * stays stable; Wave 6 swaps the bodies for real SDK calls.
 */
export function pickIntentAdapter(provider: PaymentProvider): PaymentIntentAdapter {
  if (provider === "stripe") return mockPaymentAdapter;
  if (provider === "adyen") return mockPaymentAdapter;
  return mockPaymentAdapter;
}

export function pickPayoutAdapter(provider: PaymentProvider): PayoutAdapter {
  return mockPayoutAdapter;
}
