import type { Logger } from "@/core/logging/logger";
import type { OutboundMessage } from "../domain/notification";
import type { EmailSender, WhatsAppSender } from "../domain/ports";

export interface NotificationDeps {
  email: EmailSender;
  whatsapp: WhatsAppSender;
  logger: Logger;
}

export class SendNotificationUseCase {
  constructor(private readonly deps: NotificationDeps) {}

  async run(message: OutboundMessage): Promise<void> {
    if (message.channel === "email") {
      await this.deps.email.send(message);
    } else {
      await this.deps.whatsapp.send(message);
    }
    this.deps.logger.info("Notification dispatched", {
      channel: message.channel,
      to: message.to,
      template: message.templateKey,
    });
  }
}
