"use client";

import Link from "next/link";
import { WorkerShell } from "@/features/team/components/worker-shell";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  GitBranch,
  Wallet,
  Settings,
  Search,
  Bell,
  Plus,
  Scissors,
  ScanLine,
  Ellipsis,
  ArrowUpRight,
  ChevronDown,
  X,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
} from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { Avatar, Dialog, EmptyState } from "@/shared/components/ui";
import {
  useFeatureQuery,
  useDebouncedValue,
} from "@/shared/hooks/use-feature-query";
import { QueryState } from "@/shared/components/query-state";
import type { ShellRead } from "@/shared/contracts/shell-query";
import type { OrderRead } from "@/features/orders/types/queries";
import { emptyWorkspace, isOpen } from "@/shared/workspace";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/workflow", label: "Workflow", icon: GitBranch },
  { href: "/billing", label: "Billing & payments", icon: Wallet },
  { href: "/team", label: "Team", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { owner } = useWorkspace();
  return owner.role === "worker" ? (
    <WorkerShell />
  ) : (
    <OwnerShell>{children}</OwnerShell>
  );
}
function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notice, notify, mode, owner } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const shell = useFeatureQuery<ShellRead>("/api/shell", (workspace) => ({
    revision: 0,
    openOrders: workspace.orders.filter(isOpen).length,
    activity: workspace.activity.slice(0, 8),
  }));
  const search = useFeatureQuery<OrderRead>(
    searchOpen ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    (workspace) => {
      const matches = workspace.orders.filter((order) =>
        `${order.number} ${workspace.customers.find((customer) => customer.id === order.customerId)?.name} ${order.items.map((item) => item.garment).join(" ")}`
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase().trim()),
      );
      const orders = matches.slice(0, 6);
      return {
        revision: 0,
        data: {
          ...emptyWorkspace(),
          orders,
          customers: workspace.customers.filter((customer) =>
            orders.some((order) => order.customerId === customer.id),
          ),
        },
        page: {
          page: 1,
          pageSize: 6,
          total: matches.length,
          pageCount: Math.ceil(matches.length / 6),
        },
      };
    },
  );
  const title =
    pathname === "/"
      ? "Overview"
      : pathname.startsWith("/orders/new")
        ? "New order"
        : (navigation.find(
            (entry) => entry.href !== "/" && pathname.startsWith(entry.href),
          )?.label ?? (pathname === "/scan" ? "Find an order" : "Settings"));
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const results = search.data?.data.orders ?? [];
  const searchCustomers = search.data?.data.customers ?? [];
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Scissors size={24} strokeWidth={1.5} />
          </span>
          <span className="brand-wordmark">
            swapna<span>GARMENTS</span>
          </span>
        </Link>
        <div className="shop-switcher">
          <span className="shop-initial">S</span>
          <div>
            <strong>Swapna Garments</strong>
            <span>Shop management</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation" className="main-nav">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={active(href) ? "active" : ""}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} strokeWidth={1.6} />
              <span>{label}</span>
              {href === "/orders" && shell.data && (
                <small>{shell.data.openOrders}</small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-secondary">
          <p className="nav-label">TOOLS</p>
          <Link href="/scan">
            <ScanLine size={19} strokeWidth={1.6} />
            <span>Find an order</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            href="/settings"
            aria-current={active("/settings") ? "page" : undefined}
          >
            <Settings size={19} strokeWidth={1.6} />
            <span>Settings</span>
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="studio-note">
            <Scissors size={23} strokeWidth={1.3} />
            <p>
              Orders and customers.
              <br />
              Workflow and payments.
            </p>
            <span>Your shop in one place.</span>
          </div>
          <div className="user-panel">
            <Avatar name={owner.name} />
            <div>
              <strong>{owner.name}</strong>
              <span>
                {mode === "preview" ? "Workspace preview" : "Shop owner"}
              </span>
            </div>
            <button
              className="icon-button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <Link href="/" className="mobile-brand">
            <Scissors size={23} />
            swapna<span>garments</span>
          </Link>
          <div className="topbar-actions">
            <button
              className="global-search"
              aria-label="Search orders"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
              <span>Search orders</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-button notification-button"
              onClick={() => setNotifications(true)}
              aria-label="View recent activity"
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="topbar-divider" />
            <Avatar name={owner.name} small />
          </div>
        </header>
        {mode === "preview" && (
          <div className="preview-banner">
            <span>
              <i />
              Workspace preview · Sample data
            </span>
            <Link href="/settings">
              View settings
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Orders, customers and payments.</span>
          <span>
            Swapna Garments <i /> Shop management
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link
          href="/"
          className={active("/") ? "active" : ""}
          aria-current={active("/") ? "page" : undefined}
        >
          <LayoutDashboard size={21} />
          <span>Overview</span>
        </Link>
        <Link
          href="/orders"
          className={active("/orders") ? "active" : ""}
          aria-current={active("/orders") ? "page" : undefined}
        >
          <ShoppingBag size={21} />
          <span>Orders</span>
        </Link>
        <Link
          className="mobile-scan"
          href="/scan"
          aria-current={active("/scan") ? "page" : undefined}
        >
          <span>
            <ScanLine size={23} />
          </span>
          <small>Scan</small>
        </Link>
        <Link
          href="/workflow"
          className={active("/workflow") ? "active" : ""}
          aria-current={active("/workflow") ? "page" : undefined}
        >
          <GitBranch size={21} />
          <span>Workflow</span>
        </Link>
        <button onClick={() => setMore(true)}>
          <Ellipsis size={22} />
          <span>More</span>
        </button>
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button onClick={() => notify("")} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
      {searchOpen && (
        <Dialog
          title="Search orders"
          subtitle="Find an order by customer name, order number, or garment."
          onClose={() => setSearchOpen(false)}
        >
          <div className="dialog-body">
            <label className="search-input">
              <Search size={18} />
              <input
                autoFocus
                value={query}
                maxLength={200}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, order number, or garment"
                aria-label="Search orders"
              />
            </label>
            <div className="search-results">
              <QueryState
                loading={search.isLoading}
                error={search.error}
                retry={search.reload}
              />
              {results.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  onClick={() => setSearchOpen(false)}
                >
                  <Avatar
                    name={
                      searchCustomers.find(
                        (customer) => customer.id === order.customerId,
                      )?.name ?? "Customer"
                    }
                  />
                  <div>
                    <strong>
                      {
                        searchCustomers.find(
                          (customer) => customer.id === order.customerId,
                        )?.name
                      }
                    </strong>
                    <span>
                      {order.number} ·{" "}
                      {order.items.map((item) => item.garment).join(", ")}
                    </span>
                  </div>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
              {!search.isLoading && !search.error && !results.length && (
                <EmptyState
                  title="No matches found"
                  text="Try another customer name, order number, or garment."
                />
              )}
            </div>
          </div>
        </Dialog>
      )}
      {more && (
        <Dialog title="More pages" onClose={() => setMore(false)}>
          <nav className="more-navigation" aria-label="More pages">
            {[
              ...navigation,
              { href: "/settings", label: "Settings", icon: Settings },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMore(false)}>
                <Icon size={20} />
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <Link href="/orders/new" onClick={() => setMore(false)}>
              <Plus size={20} />
              New order
              <ArrowUpRight size={16} />
            </Link>
          </nav>
        </Dialog>
      )}
      {notifications && (
        <Dialog
          title="Recent activity"
          subtitle="The latest recorded order updates."
          onClose={() => setNotifications(false)}
        >
          <div className="dialog-body activity-list">
            <QueryState
              loading={shell.isLoading}
              error={shell.error}
              retry={shell.reload}
            />
            {shell.data?.activity.map((entry) => (
              <Link
                key={entry.id}
                href={`/orders/${entry.orderId}`}
                onClick={() => setNotifications(false)}
                className="activity-item"
              >
                <span className="activity-dot">
                  <Bell size={14} />
                </span>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.detail}</p>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            <p className="small muted">
              <CircleHelp size={13} />{" "}
              {mode === "preview"
                ? "Sample order activity."
                : "Your shop’s latest recorded activity."}
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
