"use client";
import { useState } from "react";
import { Dialog } from "@/shared/components/ui";
import { STATIONS } from "@/shared/workspace";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import type { AssignmentSettings } from "../contracts/team";
export function AssignmentSettingsDialog({
  settings,
  onClose,
}: {
  settings: AssignmentSettings;
  onClose: () => void;
}) {
  const { send } = useWorkspace();
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      title="Assignment rules"
      subtitle="Balance work between available workers with the right skills."
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await send(
              { type: "team.settings", settings: draft },
              "Assignment rules saved",
            );
            onClose();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Could not save rules.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-body team-form-stack">
          <label className="team-check">
            <input
              type="checkbox"
              checked={draft.automatic}
              onChange={(e) =>
                setDraft({ ...draft, automatic: e.target.checked })
              }
            />{" "}
            Automatically assign new and newly ready work
          </label>
          <label className="field">
            Balance work by
            <select
              value={draft.balanceBy}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  balanceBy: e.target.value as "pieces" | "effort",
                })
              }
            >
              <option value="effort">Estimated effort (recommended)</option>
              <option value="pieces">Equal number of pieces</option>
            </select>
            <small>
              Effort compares estimated minutes with each worker’s capacity.
              Piece count gives the next task to the worker with the fewest
              unfinished pieces.
            </small>
          </label>
          <label className="team-check">
            <input
              type="checkbox"
              checked={draft.respectCapacity}
              onChange={(e) =>
                setDraft({ ...draft, respectCapacity: e.target.checked })
              }
            />{" "}
            Stop assigning when a worker’s queue is full
          </label>
          <fieldset className="team-fieldset">
            <legend>Estimated minutes per piece</legend>
            <p className="small muted">
              Starting estimates only. Adjust these to match your shop.
            </p>
            <div className="station-estimates">
              {STATIONS.map((station, index) => (
                <label className="field" key={station}>
                  {station}
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    required
                    value={draft.stationMinutes[index]}
                    onChange={(e) => {
                      const minutes = [
                        ...draft.stationMinutes,
                      ] as AssignmentSettings["stationMinutes"];
                      minutes[index] = Number(e.target.value);
                      setDraft({ ...draft, stationMinutes: minutes });
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <p className="note-box">
            Urgent orders come first, then earlier due dates. Existing
            assignments stay with their worker. Pieces held manually and pieces
            awaiting measurements are skipped.
          </p>
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
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save rules"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
