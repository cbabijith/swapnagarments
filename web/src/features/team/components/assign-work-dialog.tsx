"use client";
import { useListPage } from "@/shared/hooks/use-list-page";

import "./team.css";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import { QueryState, ScrollPagination } from "@/shared/components/query-state";
import { Dialog } from "@/shared/components/ui";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { STATIONS } from "@/shared/workspace";
import { currentStepName } from "@/features/workflow/domain/templates";
import { useTeam } from "../hooks/use-team";
import type { WorkPiece } from "../types/queries";

export function AssignWorkDialog({
  piece,
  onClose,
}: {
  piece: WorkPiece;
  onClose: () => void;
}) {
  const { send } = useWorkspace();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useListPage(
    JSON.stringify([debouncedSearch, piece.item.station]),
  );
  const query = useTeam(page, debouncedSearch, piece.item.station);
  async function assign(assigneeId: string | null) {
    setBusy(true);
    setError("");
    try {
      await send(
        {
          type: "work.assign",
          orderId: piece.order.id,
          pieceId: piece.item.id,
          expectedStation: piece.item.station,
          expectedVersion: piece.item.work?.version ?? 0,
          assigneeId,
        },
        assigneeId ? "Work assigned" : "Piece held for manual assignment",
      );
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not assign this work.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Assign this piece"
      subtitle={`${piece.order.number} · ${piece.item.garment} · ${currentStepName(piece.item)}`}
      onClose={onClose}
      busy={busy}
    >
      <div className="dialog-body team-form-stack">
        <label className="field">
          Find a qualified worker
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name"
          />
        </label>
        <QueryState
          loading={query.isLoading}
          error={query.error}
          retry={query.reload}
        />
        {query.data?.data.staff.map((p) => {
          const load = query.data!.loads[p.id]?.minutes ?? 0;
          const minutes =
            query.data!.settings.stationMinutes[piece.item.station];
          const full =
            query.data!.settings.respectCapacity &&
            piece.item.work?.assigneeId !== p.id &&
            load + minutes > p.worker!.capacityMinutes;
          return (
            <button
              type="button"
              className="worker-option"
              key={p.id}
              disabled={busy || full || query.isRefreshing}
              onClick={() => void assign(p.id)}
            >
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.worker!.skills.map((s) => STATIONS[s]).join(" · ")}
                </small>
              </span>
              <span>
                {load} / {p.worker!.capacityMinutes} min
                <small>{full ? "At capacity" : "Assign piece →"}</small>
              </span>
            </button>
          );
        })}
        {query.data && !query.data.data.staff.length && (
          <p className="note-box">
            No available workers match this station. Add this skill to a member
            and make them available in Team.
          </p>
        )}
        {query.data && (
          <ScrollPagination
            page={query.data.page}
            loading={query.isRefreshing}
            error={query.error}
            retry={query.reload}
            onPageChange={setPage}
          />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="dialog-actions">
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => void assign(null)}
        >
          Hold unassigned
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
