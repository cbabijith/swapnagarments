"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, PackageOpen, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  STATUS_LABEL,
  type OrderStatus,
  type Priority,
  initials,
} from "@/shared/workspace";

export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  busy = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      aria-busy={busy || undefined}
      className={`dialog ${wide ? "dialog-wide" : ""} ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (busy) return;
        if (e.target === e.currentTarget) {
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-head">
        <div>
          <p className="eyebrow">SWAPNA GARMENTS</p>
          <h2 id={id}>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Avatar({
  name,
  tone = "sage",
  small = false,
}: {
  name: string;
  tone?: string;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar ${tone} ${small ? "avatar-small" : ""}`}
    >
      {initials(name)}
    </span>
  );
}
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {STATUS_LABEL[status]}
    </span>
  );
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority priority-${priority}`}>
      {priority === "urgent" ? "↑↑" : priority === "high" ? "↑" : "−"}{" "}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  text = "Your items will appear here.",
  children,
}: {
  title?: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <PackageOpen size={30} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function SectionHeading({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {action || "View all"}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}
