export const NOTIFICATION_CHANNELS = ["email", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface OutboundMessage {
  readonly channel: NotificationChannel;
  /** Email address (email channel) or phone number (whatsapp channel). */
  readonly to: string;
  /** Identifies the template used, e.g. "order.created". */
  readonly templateKey: string;
  /** Email only. */
  readonly subject?: string;
  readonly body: string;
}
