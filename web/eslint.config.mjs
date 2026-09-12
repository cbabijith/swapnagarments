import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/features/**/*.{ts,tsx}", "src/shared/components/**/*.{ts,tsx}", "src/shared/compat/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {patterns: [{group: ["@/db", "@/db/**", "@/services/**", "@/integrations/**", "@/shared/server/**", "pg", "drizzle-orm", "drizzle-orm/**", "@aws-sdk/**", "server-only"], message: "Feature client code uses contracts and API hooks. Database and integration access belongs in server services."}]}],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
