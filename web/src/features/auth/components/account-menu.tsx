"use client";
import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import styles from "./account-menu.module.css";

export function AccountMenu() {
  const { owner, mode, signOut, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  return (
    <details
      className={styles.menu}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label="Open account menu">
        <UserRound size={19} />
      </summary>
      <div className={styles.panel}>
        <strong>{owner.name}</strong>
        <small>{mode === "preview" ? "Sample workspace" : owner.email}</small>
        {mode === "live" && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
              } catch {
                notify("Could not sign out. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={15} />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        )}
      </div>
    </details>
  );
}
