import type { Logger } from "@/core/logging/logger";
import type { OutboundMessage } from "../domain/notification";
import type { WhatsAppSender } from "../domain/ports";

/**
 * Dev adapter: logs the message instead of calling the WhatsApp API.
 * Swap for a WhatsApp Cloud API adapter when the integration is configured.
 */
export class ConsoleWhatsappSender implements WhatsAppSender {
  constructor(private readonly logger: Logger) {}

  async send(message: OutboundMessage): Promise<void> {
    this.logger.info("[dev whatsapp adapter] message ready for delivery", {
      to: message.to,
      template: message.templateKey,
      body: message.body,
    });
  }
}
