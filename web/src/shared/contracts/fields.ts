import { z } from "zod";

export const id = z.string().min(1).max(100);
export const amount = z.number().int().min(0).max(100_000_000);
export const method = z.enum(["Cash", "UPI", "Card", "Bank transfer"]);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid date.");
