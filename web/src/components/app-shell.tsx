"use client";

import Link from "next/link";
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
import { useWorkspace } from "./workspace-provider";
import { Avatar, Dialog, EmptyState } from "./ui";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/workflow", label: "Workflow", icon: GitBranch },
  { href: "/billing", label: "Billing & payments", icon: Wallet },
  { href: "/team", label: "Your team", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, notice, notify, mode, owner } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const title =
    pathname === "/"
      ? "Overview"
      : pathname.startsWith("/orders/new")
        ? "New order"
        : (navigation.find(
            (entry) => entry.href !== "/" && pathname.startsWith(entry.href),
          )?.label ?? (pathname === "/scan" ? "Find a garment" : "Settings"));
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
  const results = data.orders
    .filter((order) =>
      `${order.number} ${data.customers.find((customer) => customer.id === order.customerId)?.name} ${order.items.map((item) => item.garment).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 6);
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
            <strong>The tailoring studio</strong>
            <span>Your everyday workspace</span>
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
              {href === "/orders" && (
                <small>
                  {
                    data.orders.filter(
                      (order) =>
                        !["delivered", "cancelled"].includes(order.status),
                    ).length
                  }
                </small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-secondary">
          <p className="nav-label">TOOLS</p>
          <Link href="/scan">
            <ScanLine size={19} strokeWidth={1.6} />
            <span>Scan a garment</span>
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
              A little more organised.
              <br />A lot more peace of mind.
            </p>
            <span>Made for your everyday.</span>
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
              aria-label="Search workspace"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
              <span>Search anything...</span>
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
        <div
          className={`preview-banner ${mode === "live" ? "connected-banner" : ""}`}
        >
          <span>
            <i />
            {mode === "preview"
              ? "Workspace preview · Sample data"
              : "Your shop’s live workspace"}
          </span>
          <Link href="/settings">
            {mode === "preview"
              ? "Railway connection pending"
              : "Connected to Railway"}
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Made with care, for every stitch.</span>
          <span>
            Swapna Garments <i /> Your shop. In order.
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
          <span>Home</span>
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
          title="Find what you need"
          subtitle="Search orders, customers, or garments."
          onClose={() => setSearchOpen(false)}
        >
          <div className="dialog-body">
            <label className="search-input">
              <Search size={18} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, order number, or garment"
                aria-label="Search workspace"
              />
            </label>
            <div className="search-results">
              {results.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  onClick={() => setSearchOpen(false)}
                >
                  <Avatar
                    name={
                      data.customers.find(
                        (customer) => customer.id === order.customerId,
                      )?.name ?? "Customer"
                    }
                  />
                  <div>
                    <strong>
                      {
                        data.customers.find(
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
              {!results.length && (
                <EmptyState
                  title="No matches found"
                  text="Try a customer name or order number."
                />
              )}
            </div>
          </div>
        </Dialog>
      )}
      {more && (
        <Dialog title="Your workspace" onClose={() => setMore(false)}>
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
          title="Around the studio"
          subtitle="The latest activity in your workspace."
          onClose={() => setNotifications(false)}
        >
          <div className="dialog-body activity-list">
            {data.activity.slice(0, 8).map((entry) => (
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
                ? "Sample workspace activity."
                : "Your shop’s latest recorded activity."}{" "}
              Customer messaging is not enabled yet.
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
