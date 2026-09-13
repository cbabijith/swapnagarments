import type { WorkspaceMutation } from "./command";

/** Feature commands share one retry identity across transport retries. */
export function commandEndpoint(action: WorkspaceMutation) {
  switch (action.type) {
    case "team.save":
    case "team.settings":
    case "team.distribute":
    case "work.assign":
      return "/api/team";
    case "work.update":
      return "/api/work";
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
    case "billing.apply-gst":
      return "/api/billing";
    case "day.close":
      return "/api/reports";
  }
}
