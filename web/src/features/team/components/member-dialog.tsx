"use client";
import { useId, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { Dialog } from "@/shared/components/ui";
import { STATIONS, type Employee } from "@/shared/workspace";
import styles from "./member-dialog.module.css";
export function MemberDialog({
  person,
  onClose,
}: {
  person?: Employee;
  onClose: () => void;
}) {
  const { send, mode } = useWorkspace();
  const worker = person?.worker;
  const [skills, setSkills] = useState(
    worker?.skills ?? [
      Math.max(
        0,
        STATIONS.findIndex((s) => s === person?.station),
      ),
    ],
  );
  const [multiple, setMultiple] = useState((worker?.skills.length ?? 1) > 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await send(
        {
          type: "team.save",
          id: person?.id,
          name: form.get("name"),
          expectedRevision: worker?.revision ?? 0,
          worker: {
            email: form.get("email"),
            skills,
            active: form.get("active") === "on",
            available: form.get("available") === "on",
            capacityMinutes: Number(form.get("capacity")),
            revision: worker?.revision ?? 1,
          },
          ...(form.get("password") ? { password: form.get("password") } : {}),
        },
        worker ? "Team member updated" : "Worker account created",
      );
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save this member.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={worker ? `Edit ${person!.name}` : "Add a team member"}
      subtitle="Give each worker an account and choose the work they can do."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="dialog-body form-grid">
          <label className="field">
            Full name
            <input
              name="name"
              defaultValue={person?.name}
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
              autoFocus
            />
          </label>
          <label className="field">
            Login email
            <input
              name="email"
              type="email"
              defaultValue={worker?.email}
              required
              maxLength={150}
              autoComplete="off"
            />
          </label>
          <div className="field full-width">
            <label htmlFor={passwordId}>
              {worker
                ? "New password (leave empty to keep current)"
                : "Account password"}
            </label>
            <div className={styles.passwordControl}>
              <input
                id={passwordId}
                className={styles.passwordInput}
                name="password"
                type={showPassword ? "text" : "password"}
                required={!worker}
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
              <button
                className={styles.passwordToggle}
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-controls={passwordId}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff size={19} aria-hidden="true" />
                ) : (
                  <Eye size={19} aria-hidden="true" />
                )}
              </button>
            </div>
            <small>
              At least 12 characters. Share the login details with the worker
              privately.
            </small>
          </div>
          <fieldset className="team-fieldset full-width">
            <legend>Work skills</legend>
            <div className="team-choice-row">
              <label>
                <input
                  type="radio"
                  name="skillMode"
                  checked={!multiple}
                  onChange={() => {
                    setMultiple(false);
                    setSkills([skills[0] ?? 0]);
                  }}
                />{" "}
                One type of work
              </label>
              <label>
                <input
                  type="radio"
                  name="skillMode"
                  checked={multiple}
                  onChange={() => setMultiple(true)}
                />{" "}
                Multiple types of work
              </label>
            </div>
            <div className="skill-choices">
              {STATIONS.map((station, index) => (
                <label
                  key={station}
                  className={skills.includes(index) ? "selected" : ""}
                >
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name="skills"
                    checked={skills.includes(index)}
                    onChange={() =>
                      setSkills(
                        multiple
                          ? skills.includes(index)
                            ? skills.filter((s) => s !== index)
                            : [...skills, index]
                          : [index],
                      )
                    }
                  />
                  {station}
                </label>
              ))}
            </div>
            <small>Tasks can only be assigned at these stations.</small>
          </fieldset>
          <label className="field full-width">
            Queue capacity (estimated minutes)
            <input
              type="number"
              name="capacity"
              min={30}
              max={10080}
              step={1}
              defaultValue={worker?.capacityMinutes ?? 480}
              required
            />
            <small>
              480 minutes is about one workday. This limits unfinished work
              assigned at once; it does not reset daily.
            </small>
          </label>
          <label className="team-check">
            <input
              type="checkbox"
              name="active"
              defaultChecked={worker?.active ?? true}
            />{" "}
            Account active
          </label>
          <label className="team-check">
            <input
              type="checkbox"
              name="available"
              defaultChecked={worker?.available ?? true}
            />{" "}
            Available for new work
          </label>
          <p className="small muted full-width">
            Unavailable workers keep their queue. Deactivating an account stops
            sign-in and releases pending assignments.
          </p>
          {mode === "preview" && (
            <p className="note-box full-width">
              Sample account only. Live sign-in is available when the database
              is connected.
            </p>
          )}
          {error && (
            <p className="form-error full-width" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={busy || !skills.length}
          >
            {busy
              ? "Saving…"
              : worker
                ? "Save member"
                : "Create worker account"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
