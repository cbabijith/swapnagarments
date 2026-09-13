import type { WorkspaceMutation } from "./command";

/** Feature commands share one retry identity across transport retries. */
export function commandEndpoint(action: WorkspaceMutation) {
  switch (action.type) {
    case "settings.save":
      return "/api/settings";
    case "measurement.save":
    case "piece.measurements":
      return "/api/measurements";
    case "order.intake":
      return "/api/orders";
    case "customer.save":
      return "/api/customers";
    case "order.create":
    case "order.deliver":
      return "/api/orders";
    case "piece.advance":
    case "piece.rework":
      return "/api/workflow";
    case "payment.record":
      return "/api/billing";
    case "day.close":
      return "/api/reports";
  }
}
