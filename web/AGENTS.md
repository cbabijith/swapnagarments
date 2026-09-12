<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Swapna Garments architecture requirement

The owner's 2026-09-12 requirement is to follow the feature-driven architecture
of the local Dolce CRM project. Read `../docs/ARCHITECTURE-ALIGNMENT.md` before
implementing new features or structural changes. That document is the target;
the feature/service extraction, Drizzle baseline and relational migration are
implemented, along with paginated feature reads. Workspace API adapters remain
for older clients. Read `../docs/RELATIONAL-MIGRATION.md` before storage cutover work.
Use only `shahil` for development and `main` for verified releases; the owner does
not want additional feature or `codex/` branches.

- Keep the active app in `web/`: Next.js pages and API Route Handlers. No Server
  Actions or separate backend deployment is required.
- Feature UI, hooks, types, and contracts belong in `src/features/<feature>/`.
- Pure rules in feature `domain/` folders are shared with the sample preview;
  live services execute them against locked database state. Keep preview data
  out of live services. Shared compatibility adapters are temporary, not the
  location for new business rules.
- Keep route handlers thin: transport, authentication/authorization, Zod input
  validation, service call, and response handling.
- Server-only `src/services/` modules own business rules, transactions, and
  persistence. React UI must not be the authority for business invariants.
- The target database layer is Drizzle in `src/db/`, with domain schemas and
  versioned migrations. Preserve the existing Railway database, owner account,
  and real records; migrate the JSON workspace through the documented phases.
- Startup migrations add schemas; only the operator migration service switches
  storage models. Preserve reconciliation, immutable snapshots, revision/checksum
  guards, and rollback of current data. Never replace current relational records
  with a stale JSON snapshot or log customer records/credentials in CLI output.
- Cross-feature side effects use durable events committed with their state
  change and handled by retryable, idempotent consumers.
- Shared infrastructure belongs in `src/shared/`; external storage/provider
  adapters belong in `src/integrations/`. Never expose server credentials to UI.
- Use server-side filtering, sorting, pagination, and report computation instead
  of downloading all shop data for operational queries.
- Refactor in validated stages with compatibility adapters. Update the project
  documentation to distinguish completed work from the target architecture.
