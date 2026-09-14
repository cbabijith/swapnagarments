import type { Employee } from "../types";
import type { WorkerProfile } from "../types/worker-profile";

export function workerProfileFor(person?: Employee): WorkerProfile | null {
  if (!person?.worker?.active) return null;
  return {
    id: person.id,
    name: person.name,
    email: person.worker.email,
    role: person.role,
    color: person.color,
    skills: person.worker.skills,
    available: person.worker.available,
    capacityMinutes: person.worker.capacityMinutes,
  };
}
