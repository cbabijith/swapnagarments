import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  APP_NAME: z.string().default("Swapna Garments"),

  // HTTP server
  PORT: z.coerce.number().int().default(3001),
  /** Origin of the web app — allowed for CORS and Better Auth trusted origins. */
  WEB_ORIGIN: z.string().default("http://localhost:3000"),

  // Better Auth (URL includes the /auth mount path — BA derives basePath from it)
  BETTER_AUTH_SECRET: z.string().min(16).default("dev-only-secret-change-me"),
  BETTER_AUTH_URL: z.string().default("http://localhost:3001/auth"),

  // SQLite file used by Better Auth (the domain DB choice is a workshop topic)
  DATABASE_FILE: z.string().default("./data/swapna.db"),

  // Reserved for upcoming integrations (see .env.example)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Server-side environment access. Fails fast on invalid values. */
export function getEnv(): Env {
  cached ??= envSchema.parse(process.env);
  return cached;
}
