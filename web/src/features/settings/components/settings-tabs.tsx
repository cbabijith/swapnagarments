"use client";
import type { CSSProperties, ReactNode } from "react";
import styles from "./catalogue.module.css";
export function SettingsTabs<T extends string>({
  id,
  label,
  value,
  items,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: T;
  items: { value: T; label: string; icon?: ReactNode; count?: number }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={styles.tabs}
      role="tablist"
      aria-label={label}
      style={{ "--settings-tab-count": items.length } as CSSProperties}
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          id={`${id}-tab-${item.value}`}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          aria-controls={`${id}-panel-${item.value}`}
          tabIndex={value === item.value ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % items.length;
            else if (event.key === "ArrowLeft")
              next = (index + items.length - 1) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            onChange(items[next].value);
            document.getElementById(`${id}-tab-${items[next].value}`)?.focus();
          }}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined && <small>{item.count}</small>}
        </button>
      ))}
    </div>
  );
}
