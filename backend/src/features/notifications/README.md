# Notifications

Event-driven customer notifications over email and WhatsApp.

## How it works

- `application/register-order-handlers.ts` subscribes to `order.created`
  and `order.status.changed` on the event bus and sends a templated message
  on every channel the customer can be reached on (WhatsApp via phone is
  always attempted; email only when an address is on file).
- Templates live in `domain/templates.ts` (plain functions for now; formal
  template registry + languages after the workshop).
- `infrastructure/` contains **dev adapters** that log instead of sending —
  swap `ConsoleEmailSender` → SMTP adapter and `ConsoleWhatsappSender` →
  WhatsApp Cloud API adapter once providers are chosen.

The bus isolates handler failures, so a notification problem can never fail
an order workflow — exactly the guarantee the shop needs before wiring real
providers.
