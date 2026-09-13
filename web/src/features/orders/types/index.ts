import type { Payment } from "@/features/billing/types";
export type Priority = "normal" | "high" | "urgent";
export type OrderStatus =
  "received" | "in_progress" | "ready" | "delivered" | "cancelled";
export type OrderItem = {
  work?: import("@/features/team/contracts/team").PieceWork;
  workflow?: import("@/features/workflow/contracts/settings").PieceWorkflow;
  design?: import("@/features/design-library/contracts").DesignSnapshot;
  measurement?: import("@/features/measurements/contracts/profiles").MeasurementSnapshot;
  measurementHistory?: import("@/features/measurements/contracts/profiles").MeasurementSnapshot[];
  id: string;
  garment: string;
  material: string;
  station: number;
  price: number;
};
export type Order = {
  gst?: import("@/features/billing/contracts/gst").GstSnapshot;
  id: string;
  number: string;
  customerId: string;
  items: OrderItem[];
  priority: Priority;
  dueDate: string;
  createdAt: string;
  status: OrderStatus;
  notes: string;
  payments: Payment[];
  deliveredAt?: string;
};
