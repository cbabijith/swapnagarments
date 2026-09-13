export type Customer = {
  profiles?: import("@/features/measurements/contracts/profiles").MeasurementProfile[];
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  measurements: Record<string, string>;
  measurementHistory?: { date: string; values: Record<string, string> }[];
};
