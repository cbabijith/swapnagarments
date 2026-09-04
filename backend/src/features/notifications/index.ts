export { registerOrderNotificationHandlers } from "./application/register-order-handlers";
export { ConsoleEmailSender } from "./infrastructure/console-email-sender";
export { ConsoleWhatsappSender } from "./infrastructure/console-whatsapp-sender";
export type { OutboundMessage, NotificationChannel } from "./domain/notification";
export type { EmailSender, WhatsAppSender } from "./domain/ports";
