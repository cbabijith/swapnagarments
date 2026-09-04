# Employees (planned)

**Status:** scaffolded — built after the domain workshop.

## Purpose

Staff accounts and the people-side of the workflow: who works on what, at
which station, and what each employee is allowed to do.

## Planned responsibilities

- Employee accounts + roles (owner, counter, master tailor, cutting,
  ironing, …) and permissions
- Station work queues (assigned by owner vs pulled by employees — workshop
  decision)
- Per-step attribution: which employee completed cutting/stitching/ironing
  and when (audit trail)
- Workload/productivity views

## Candidate events

- `employee.created`, `task.assigned`, `task.completed`

## Open questions

See docs/DOMAIN-DISCUSSION.md §4.
