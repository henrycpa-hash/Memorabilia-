/**
 * Wave 4 supports three notification channels.
 *
 *   in_app  — already implemented by notification-service (Wave 2)
 *   email   — adapter stub in Wave 4; real provider lands in Wave 5
 *   push    — adapter stub in Wave 4; real provider lands in Wave 5
 */
export type NotificationChannel = "in_app" | "email" | "push";

export const ALL_CHANNELS: NotificationChannel[] = ["in_app", "email", "push"];

export type DeliveryAdapter = {
  send(input: {
    toUserId: string;
    channel: NotificationChannel;
    templateKey: string;
    payload: Record<string, unknown>;
  }): Promise<{ ok: boolean; channel: NotificationChannel }>;
};

/**
 * Stub delivery adapter for Wave 4. Real SendGrid / FCM adapters land in Wave 5.
 * The contract is intentionally narrow so the swap is mechanical.
 */
export const stubDelivery: DeliveryAdapter = {
  async send(input) {
    // eslint-disable-next-line no-console
    console.log(
      `[delivery:stub] ${input.channel} → ${input.toUserId} (${input.templateKey})`
    );
    return { ok: true, channel: input.channel };
  }
};
