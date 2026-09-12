import { z } from "zod";

export const credentialsSchema = z.object({
  action: z.enum(["setup", "signin"]),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(150),
  password: z.string().min(12).max(128),
  setupToken: z.string().max(200).optional(),
});
export type Credentials = z.infer<typeof credentialsSchema>;
