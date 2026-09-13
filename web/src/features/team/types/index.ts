export type Employee = {
  worker?: import("../contracts/team").Worker;
  id: string;
  name: string;
  role: string;
  station: string;
  color: string;
};
