import type { Logger } from "@/core/logging/logger";
import type { OutboundMessage } from "../domain/notification";
import type { EmailSender } from "../domain/ports";

/**
 * Dev adapter: logs the message instead of sending SMTP traffic.
 * Swap for a real SMTP adapter when the integration is configured.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async send(message: OutboundMessage): Promise<void> {
    this.logger.info("[dev email adapter] message ready for delivery", {
      to: message.to,
      subject: message.subject,
      template: message.templateKey,
      body: message.body,
    });
  }
}
