const MODULES = [
  {
    name: "Orders",
    status: "live",
    detail: "Single and multi-item tailoring orders with due dates and priority.",
  },
  {
    name: "Notifications",
    status: "live (dev adapters)",
    detail: "Email and WhatsApp messages to customers, driven by domain events.",
  },
  {
    name: "Customers",
    status: "planned",
    detail: "Customer registry with contact details and order history.",
  },
  {
    name: "Measurements",
    status: "planned",
    detail: "Per-garment measurement profiles captured at intake, reused for repeats.",
  },
  {
    name: "Process Workflow",
    status: "planned",
    detail: "Cutting, sizing, handloom, stitching and ironing stations with correction loops.",
  },
  {
    name: "Employees",
    status: "planned",
    detail: "Staff accounts, roles and task assignment per station.",
  },
  {
    name: "QR Tags",
    status: "planned",
    detail: "Printed QR label per cloth piece, scanned at every station.",
  },
  {
    name: "Billing",
    status: "planned",
    detail: "Quotation, advance payments and final invoice generation.",
  },
] as const;

const ENDPOINTS = [
  ["POST", ":3001/auth/sign-up/email", "Staff sign-up (Better Auth)"],
  ["POST", ":3001/auth/sign-in/email", "Staff sign-in → session cookie"],
  ["POST", ":3001/api/v1/orders", "Create an order (event: order.created)"],
  ["GET", ":3001/api/v1/orders", "List orders, optional ?status= & ?priority="],
  ["PATCH", ":3001/api/v1/orders/:id", "Change status (event: order.status.changed)"],
  ["GET", ":3001/api/v1/events", "Recent domain events (auth required)"],
  ["GET", ":3001/health", "Backend health check"],
] as const;

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Custom tailoring management
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Swapna Garments</h1>
          </div>
          <span className="w-fit rounded-full border border-black/10 px-3 py-1 font-mono text-[11px] text-zinc-600 dark:border-white/15 dark:text-zinc-400">
            Next.js 16.3.4 · TypeScript strict · event-driven
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">
            From measurement to delivery — one system.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Order intake, customer measurements, shop-floor workflow (cutting, sizing,
            handloom, stitching, ironing), QR-tagged pieces, billing, and customer
            notifications on every step. This web app is the dashboard; the business
            logic lives in the Hono backend (<code className="rounded bg-black/[.06] px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/[.08]">/backend</code>,
            port 3001, Better Auth + event-driven APIs). Shop-floor modules are built
            after the domain workshop — see{" "}
            <code className="rounded bg-black/[.06] px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/[.08]">
              docs/DOMAIN-DISCUSSION.md
            </code>
            .
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((module) => {
            const live = module.status !== "planned";
            return (
              <div
                key={module.name}
                className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{module.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      live
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {live ? "live" : "planned"}
                  </span>
                </div>
                <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  {module.detail}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Backend API — http://localhost:3001
          </h3>
          <ul className="mt-4 divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
            {ENDPOINTS.map(([method, path, description]) => (
              <li
                key={`${method} ${path}`}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="w-12 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {method}
                </span>
                <code className="font-mono text-xs">{path}</code>
                <span className="text-xs text-zinc-500 sm:ml-auto dark:text-zinc-400">
                  {description}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-black/10 dark:border-white/15">
        <div className="mx-auto max-w-5xl px-6 py-5 text-xs text-zinc-500 dark:text-zinc-400">
          Setup phase complete · architecture in{" "}
          <code className="font-mono">docs/ARCHITECTURE.md</code> · event catalog in{" "}
          <code className="font-mono">docs/EVENTS.md</code>
        </div>
      </footer>
    </div>
  );
}
