import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
async function main() {
  if (args.length !== 1 || !["--check", "--delete-orphans"].includes(args[0])) {
    console.log(
      "Usage: node --conditions=react-server --import tsx scripts/design-image-maintenance.ts --check | --delete-orphans\nOnly unrecorded uploads older than seven days qualify. Saved and archived images are retained.",
    );
    process.exitCode = args.includes("--help") ? 0 : 1;
  } else {
    const { cleanupDesignUploads } =
      await import("../src/services/design-cleanup-service");
    const { database } = await import("../src/db");
    try {
      console.log(
        JSON.stringify(
          await cleanupDesignUploads(args[0] === "--delete-orphans"),
        ),
      );
    } catch (error) {
      console.error(error instanceof Error ? error.name : "MaintenanceFailed");
      process.exitCode = 1;
    } finally {
      await database().end();
    }
  }
}
void main();
