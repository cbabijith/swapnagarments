import { z } from "zod";

export const measurementsSchema = z
  .record(
    z.string().min(1).max(80),
    z
      .string()
      .refine(
        (value) =>
          Number.isFinite(Number(value)) &&
          Number(value) > 0 &&
          Number(value) <= 150,
        "Measurements must be between 0 and 150 inches.",
      ),
  )
  .refine((value) => Object.keys(value).length <= 30);
