export type WorkerProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  skills: number[];
  available: boolean;
  capacityMinutes: number;
};

export type WorkerProfileRead = {
  revision: number;
  profile: WorkerProfile | null;
};
