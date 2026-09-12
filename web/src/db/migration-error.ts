/** Safe to show in operator output; never include SQL parameters or shop records. */
export class StorageMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageMigrationError";
  }
}
