import { database } from "../src/db";
import { StorageMigrationError } from "../src/db/migration-error";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";

const help = `Usage: npm run db:relational -w web -- <command> [options]

Commands:
  status          Show storage model, revision, counts, paise totals and checksum.
  check           Rehearse JSON-to-relational cutover, then roll back all data writes.
  check-rollback  Rehearse restoring the current relational state to JSON.
  cutover         Switch to relational storage after reconciliation.
  rollback        Restore the current relational state to JSON, retaining new records.

Required for cutover and rollback:
  --expected-revision <revision from the rehearsal>
  --expected-checksum <checksum from the rehearsal>
  --backup-reference <verified external backup identifier>

DATABASE_URL must already be set in the operator environment. Startup/schema
migrations are additive; none of these commands deletes app tables or records.
Before production cutover, obtain a full database backup and rehearse on an
isolated restored copy. Workspace snapshots are not substitutes for that backup.
`;

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "help") {
    console.log(help);
    return;
  }
  if (
    !["status", "check", "check-rollback", "cutover", "rollback"].includes(
      command,
    )
  )
    throw new StorageMigrationError("Unknown command. Use --help.");
  const options = new Map<string, string>();
  for (let at = 0; at < args.length; at += 2) {
    const flag = args[at],
      value = args[at + 1];
    if (
      ![
        "--expected-revision",
        "--expected-checksum",
        "--backup-reference",
      ].includes(flag) ||
      !value ||
      options.has(flag)
    )
      throw new StorageMigrationError(
        "Invalid or duplicate option. Use --help.",
      );
    options.set(flag, value);
  }
  if (!process.env.DATABASE_URL)
    throw new StorageMigrationError(
      "DATABASE_URL is not configured in this operator environment.",
    );
  if (command === "status") {
    if (options.size)
      throw new StorageMigrationError(
        "Status does not accept transition options.",
      );
    console.log(JSON.stringify(await storageStatus(), null, 2));
    return;
  }
  const expectedRevision = options.get("--expected-revision");
  if (expectedRevision !== undefined && !/^\d+$/.test(expectedRevision))
    throw new StorageMigrationError(
      "Expected revision must be a nonnegative integer.",
    );
  const result = await transitionWorkspaceStorage({
    direction:
      command === "rollback" || command === "check-rollback"
        ? "rollback"
        : "cutover",
    dryRun: command === "check" || command === "check-rollback",
    expectedRevision:
      expectedRevision === undefined ? undefined : Number(expectedRevision),
    expectedChecksum: options.get("--expected-checksum"),
    backupReference: options.get("--backup-reference"),
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(
      error instanceof StorageMigrationError
        ? error.message
        : "The database operation failed. Check connectivity and database logs. No credentials or shop records were printed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await database().end();
  });
