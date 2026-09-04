import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/features/auth/infrastructure/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_FILE ?? "./data/swapna.db",
  },
});
