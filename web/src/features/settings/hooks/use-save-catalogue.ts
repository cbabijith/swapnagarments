"use client";
import { useRef, useState } from "react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { catalogueSchema, type Catalogue } from "../contracts/catalogue";

export function useSaveCatalogue() {
  const { send } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    retry = useRef<{ body: string; id: string } | null>(null);
  async function save(catalogue: Catalogue, message: string) {
    if (pending.current) return false;
    const parsed = catalogueSchema.safeParse(catalogue);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Review your settings.");
      return false;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    const body = JSON.stringify(parsed.data);
    if (retry.current?.body !== body)
      retry.current = { body, id: crypto.randomUUID() };
    try {
      await send(
        { type: "settings.save", catalogue: parsed.data },
        message,
        retry.current.id,
      );
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save. Your changes are still here.",
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { save, busy, error, setError };
}
