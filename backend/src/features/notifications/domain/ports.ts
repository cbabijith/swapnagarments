import type { OutboundMessage } from "./notification";

export interface EmailSender {
  send(message: OutboundMessage): Promise<void>;
}

export interface WhatsAppSender {
  send(message: OutboundMessage): Promise<void>;
}
