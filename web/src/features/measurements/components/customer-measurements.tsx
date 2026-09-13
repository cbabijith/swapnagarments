"use client";
import { useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/types";
import type { Garment } from "@/features/settings/contracts/catalogue";
import { useCatalogue } from "@/features/settings/hooks/use-catalogue";
import { GarmentImage } from "@/features/design-library/components/asset-image";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { QueryState } from "@/shared/components/query-state";
import { Dialog } from "@/shared/components/ui";
import { MeasurementFields, MeasurementSummary } from "./measurement-fields";
import { profileFor, compatibleValues, legacyValues } from "../domain/values";

export function CustomerMeasurements({ customer }: { customer: Customer }) {
  const read = useCatalogue();
  const [edit, setEdit] = useState<Garment | null>(null);
  return (
    <section className="panel padded">
      <h2>Measurements by garment</h2>
      <p className="muted" style={{ margin: "8px 0 18px" }}>
        Saved profiles are offered on the next order. Changes here never change
        existing pieces.
      </p>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      <div className="inline-row" style={{ flexWrap: "wrap" }}>
        {read.data?.catalogue.garments
          .filter((g) => g.active)
          .map((g) => (
            <button
              type="button"
              className="button"
              key={g.id}
              onClick={() => setEdit(structuredClone(g))}
            >
              <GarmentImage garment={g} size={32} />
              {profileFor(customer, g.id) ? "Edit" : "Add"} {g.name}
            </button>
          ))}
      </div>
      {customer.profiles?.map((profile) => (
        <div key={profile.garmentId} style={{ marginTop: 22 }}>
          <h3>
            {profile.snapshot.garmentName} · version {profile.revision}
          </h3>
          <MeasurementSummary snapshot={profile.snapshot} />
          {profile.history.length > 0 && (
            <details>
              <summary>
                Previous measurements ({profile.history.length})
              </summary>
              {[...profile.history].reverse().map((snapshot, index) => (
                <MeasurementSummary
                  key={`${snapshot.recordedAt}-${index}`}
                  snapshot={snapshot}
                />
              ))}
            </details>
          )}
        </div>
      ))}
      {Object.keys(customer.measurements).length > 0 && (
        <details style={{ marginTop: 22 }}>
          <summary>Legacy measurements (preserved)</summary>
          <p className="muted small">
            These earlier values have no confirmed garment template. Copy
            matching blouse fields into a new profile and review them.
          </p>
          <dl className="measurement-grid">
            {Object.entries(customer.measurements).map(([name, value]) => (
              <div key={name} className="measurement-box">
                <dt>{name}</dt>
                <dd>{value} in</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {edit && (
        <ProfileEditor
          customer={customer}
          garment={edit}
          onClose={() => setEdit(null)}
        />
      )}
    </section>
  );
}
function ProfileEditor({
  customer,
  garment,
  onClose,
}: {
  customer: Customer;
  garment: Garment;
  onClose: () => void;
}) {
  const { send } = useWorkspace();
  const [expectedRevision] = useState(
    () => profileFor(customer, garment.id)?.revision ?? 0,
  );
  const [values, setValues] = useState(() =>
    compatibleValues(garment, customer),
  );
  const [source, setSource] = useState<"profile" | "new" | "legacy">(
    expectedRevision ? "profile" : "new",
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await send(
        {
          type: "measurement.save",
          customerId: customer.id,
          garmentId: garment.id,
          garmentRevision: garment.revision,
          measurements: {
            values,
            extraFields: [],
            source,
            expectedProfileRevision: expectedRevision,
            confirmed: true,
            saveProfile: true,
          },
        },
        "Measurement profile saved.",
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save measurements.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`${garment.name} measurements`}
      subtitle={`Customer: ${customer.name} · ${garment.unit === "in" ? "Inches" : "Centimetres"}`}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={save}>
        <div className="dialog-body">
          {garment.id === "garment-blouse" &&
            Object.keys(customer.measurements).length > 0 && (
              <button
                type="button"
                className="button"
                style={{ marginBottom: 16 }}
                onClick={() => {
                  setValues(legacyValues(garment, customer));
                  setSource("legacy");
                }}
              >
                Copy matching legacy sizes for review
              </button>
            )}
          <MeasurementFields
            fields={garment.fields}
            unit={garment.unit}
            values={values}
            onChange={setValues}
            required
            disabled={busy}
          />
          {!garment.fields.length && (
            <p>
              This service has no measurement fields. Add fields in Settings if
              needed.
            </p>
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
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Confirm & save profile"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
