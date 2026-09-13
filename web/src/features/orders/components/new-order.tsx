"use client";
import {
  DesignChoices,
  emptyDesign,
} from "@/features/design-library/components/design-choices";
import type { DesignInput } from "@/features/design-library/contracts";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerPicker } from "@/features/customers/components/customer-picker";
import { useCustomerDetail } from "@/features/customers/hooks/use-customer-reads";
import { useCatalogue } from "@/features/settings/hooks/use-catalogue";
import {
  calculateGst,
  gstSettingsFor,
  totalWithGst,
} from "@/features/billing/domain/gst";
import { GstSummary } from "@/features/billing/components/gst-summary";
import { GarmentPicker } from "@/features/settings/components/garment-picker";
import { workflowForGarment } from "@/features/workflow/domain/templates";
import type {
  Catalogue,
  Garment,
} from "@/features/settings/contracts/catalogue";
import type { Customer } from "@/features/customers/types";
import type { Intake } from "../contracts/intake";
import type { MeasurementInput } from "@/features/measurements/contracts/profiles";
import {
  compatibleValues,
  legacyValues,
  profileFor,
} from "@/features/measurements/domain/values";
import {
  MeasurementFields,
  AddMeasurementField,
} from "@/features/measurements/components/measurement-fields";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { money, offsetDate } from "@/shared/workspace";
import { PageHeading } from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import styles from "./intake.module.css";

type DraftPiece = {
  id: string;
  garment: Garment;
  price: string;
  quantity: number;
  material: string;
  measurements: MeasurementInput;
  design: DesignInput;
};
function draftPiece(
  garment: Garment,
  customer: Customer | null,
  saveProfile = false,
): DraftPiece {
  const profile = profileFor(customer, garment.id);
  return {
    id: crypto.randomUUID(),
    garment: structuredClone(garment),
    price: garment.price === null ? "" : String(garment.price / 100),
    quantity: 1,
    material: "",
    design: emptyDesign(),
    measurements: {
      values: compatibleValues(garment, customer),
      extraFields: [],
      source: profile ? "profile" : "new",
      expectedProfileRevision: profile?.revision ?? 0,
      confirmed: garment.fields.length === 0,
      saveProfile,
    },
  };
}
export function NewOrderForm() {
  const catalogue = useCatalogue();
  const [selection, setSelection] = useState<Customer | "new" | null>(null);
  const [newContact, setNewContact] = useState("");
  const [saving, setSaving] = useState(false);
  const customerRead = useCustomerDetail(
    selection && selection !== "new" ? selection.id : null,
  );
  const customer = customerRead.data?.data.customers[0];
  return (
    <>
      <Link className="back-link" href="/orders">
        ← Back to orders
      </Link>
      <PageHeading
        eyebrow="ORDER INTAKE"
        title="New order"
        description="Customer, garments and measurements, then one save."
      />
      <QueryState
        loading={catalogue.isLoading}
        error={catalogue.error}
        retry={catalogue.reload}
      />
      <section className={`panel form-panel ${styles.customer}`}>
        <div className="form-section-title">
          <span>01</span>
          <h2>Customer</h2>
        </div>
        {selection === "new" ? (
          <div className={styles.row}>
            <strong>New customer</strong>
            <button
              type="button"
              className="text-link"
              disabled={saving}
              onClick={() => setSelection(null)}
            >
              Choose an existing customer
            </button>
          </div>
        ) : (
          <CustomerPicker
            value={selection}
            disabled={saving}
            onSelect={setSelection}
            onAddNew={(query) => {
              setNewContact(query);
              setSelection("new");
            }}
          />
        )}
        {selection && (
          <p className="muted small">
            Changing customer starts a fresh garment draft so measurements
            cannot mix.
          </p>
        )}
      </section>
      {selection && selection !== "new" && (
        <QueryState
          loading={customerRead.isLoading}
          error={customerRead.error}
          retry={customerRead.reload}
        />
      )}
      {catalogue.data &&
        (selection === "new" ||
          (customer && selection && customer.id === selection.id)) && (
          <OrderComposer
            key={selection === "new" ? "new" : selection.id}
            customer={selection === "new" ? null : customer!}
            catalogue={catalogue.data.catalogue}
            newContact={newContact}
            onSaving={setSaving}
          />
        )}
    </>
  );
}
function OrderComposer({
  customer,
  catalogue,
  newContact,
  onSaving,
}: {
  customer: Customer | null;
  catalogue: Catalogue;
  newContact: string;
  onSaving: (value: boolean) => void;
}) {
  const { send, today, mode } = useWorkspace();
  const router = useRouter();
  const initialGarment =
    catalogue.garments.find(
      (g) => g.active && g.id === catalogue.defaultGarmentId,
    ) ?? catalogue.garments.find((g) => g.active)!;
  const [items, setItems] = useState<DraftPiece[]>(() => [
    draftPiece(
      initialGarment,
      customer,
      !profileFor(customer, initialGarment.id),
    ),
  ]);
  const [advance, setAdvance] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const retry = useRef<{ body: string; id: string } | null>(null);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Math.round(Number(item.price || 0) * 100) * item.quantity,
    0,
  );
  const gstSettings = gstSettingsFor(catalogue);
  const gst = calculateGst(subtotal, gstSettings);
  const quoted = totalWithGst(subtotal, gst);
  const payment = Math.round(Number(advance || 0) * 100);
  function update(id: string, changes: Partial<DraftPiece>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
  function measures(item: DraftPiece, change: Partial<MeasurementInput>) {
    setItems((current) =>
      current.map((row) =>
        row.id === item.id
          ? { ...row, measurements: { ...row.measurements, ...change } }
          : change.saveProfile && row.garment.id === item.garment.id
            ? {
                ...row,
                measurements: { ...row.measurements, saveProfile: false },
              }
            : row,
      ),
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    if (payment > quoted) {
      setError("The advance cannot be more than the total.");
      return;
    }
    const action: Intake = {
      type: "order.intake",
      gstSettings,
      customer: customer
        ? { kind: "existing", id: customer.id }
        : {
            kind: "new",
            name: String(form.get("customerName") ?? ""),
            phone: String(form.get("phone") ?? ""),
            email: String(form.get("email") ?? ""),
            notes: "",
          },
      items: items.map((item) => ({
        garmentId: item.garment.id,
        garmentRevision: item.garment.revision,
        price: Math.round(Number(item.price) * 100),
        quantity: item.quantity,
        material: item.material,
        design: item.design,
        measurements: {
          ...item.measurements,
          saveProfile:
            item.measurements.confirmed && item.measurements.saveProfile,
        },
      })),
      dueDate: String(form.get("dueDate")),
      priority: String(form.get("priority")) as Intake["priority"],
      advance: payment,
      method: String(form.get("method") || "Cash") as Intake["method"],
      notes: String(form.get("notes") || ""),
    };
    const body = JSON.stringify(action);
    if (retry.current?.body !== body)
      retry.current = { body, id: crypto.randomUUID() };
    setBusy(true);
    onSaving(true);
    try {
      const result = await send(
        action,
        "Customer, measurements and order saved.",
        retry.current.id,
      );
      if (!result.resultId)
        throw new Error("The saved order could not be opened.");
      router.push(`/orders/${result.resultId}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save the order. Your entries are still here.",
      );
    } finally {
      setBusy(false);
      onSaving(false);
    }
  }
  return (
    <form className="order-form-layout" onSubmit={submit}>
      <fieldset className="order-fields" disabled={busy}>
        {!customer && (
          <section className="panel form-panel">
            <div className="form-grid">
              <label className="field">
                Customer name
                <input
                  autoFocus
                  name="customerName"
                  defaultValue={
                    /^[+\d\s-]+$/.test(newContact) ? "" : newContact
                  }
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label className="field">
                Phone number
                <input
                  type="tel"
                  name="phone"
                  defaultValue={
                    /^[+\d\s-]+$/.test(newContact) ? newContact : ""
                  }
                  required
                  maxLength={16}
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                />
              </label>
              <label className="field full-width">
                Email (optional)
                <input
                  type="email"
                  name="email"
                  maxLength={150}
                  autoComplete="email"
                />
              </label>
            </div>
            <p className="muted small">
              The customer is added when you save this order.
            </p>
          </section>
        )}
        <section className="panel form-panel">
          <div className="form-section-title">
            <span>02</span>
            <h2>Garments & measurements</h2>
          </div>
          {items.map((item, index) => {
            const profile = profileFor(customer, item.garment.id),
              fields = [
                ...item.garment.fields,
                ...item.measurements.extraFields,
              ];
            const current = catalogue.garments.find(
              (g) => g.id === item.garment.id,
            );
            const changed =
              current?.revision !== item.garment.revision || !current.active;
            return (
              <section
                className={styles.piece}
                key={item.id}
                aria-label={`Garment ${index + 1}`}
              >
                <div className={styles.row}>
                  <h3>Garment {index + 1}</h3>
                  <button
                    type="button"
                    className="text-link"
                    disabled={count >= 50}
                    onClick={() =>
                      setItems([
                        ...items,
                        {
                          ...structuredClone(item),
                          id: crypto.randomUUID(),
                          quantity: 1,
                          measurements: {
                            ...structuredClone(item.measurements),
                            saveProfile: false,
                          },
                        },
                      ])
                    }
                  >
                    Duplicate
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        setItems(items.filter((row) => row.id !== item.id))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <GarmentPicker
                    selected={item.garment}
                    garments={catalogue.garments}
                    onChange={(next) => {
                      update(item.id, {
                        ...draftPiece(
                          next,
                          customer,
                          !profileFor(customer, next.id) &&
                            !items.some(
                              (row) =>
                                row.id !== item.id &&
                                row.garment.id === next.id &&
                                row.measurements.saveProfile,
                            ),
                        ),
                        id: item.id,
                        material: item.material,
                      });
                    }}
                  />
                  <label className="field">
                    Price per piece (₹)
                    <input
                      aria-label={`Price for garment ${index + 1}`}
                      required
                      type="number"
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        update(item.id, { price: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        update(item.id, { quantity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="field">
                    Fabric & design notes
                    <input
                      maxLength={500}
                      placeholder="Colour, fabric received, style…"
                      value={item.material}
                      onChange={(e) =>
                        update(item.id, { material: e.target.value })
                      }
                    />
                  </label>
                </div>
                {item.quantity > 1 && (
                  <button
                    type="button"
                    className="text-link"
                    disabled={count > 50}
                    onClick={() =>
                      setItems(
                        items.flatMap((row) =>
                          row.id !== item.id
                            ? [row]
                            : Array.from(
                                { length: item.quantity },
                                (_, at) => ({
                                  ...structuredClone(item),
                                  id: at ? crypto.randomUUID() : item.id,
                                  quantity: 1,
                                  measurements: {
                                    ...structuredClone(item.measurements),
                                    saveProfile:
                                      !at && item.measurements.saveProfile,
                                  },
                                }),
                              ),
                        ),
                      )
                    }
                  >
                    Give each piece different measurements or notes
                  </button>
                )}
                {changed && (
                  <div className="note-box">
                    This garment’s settings changed.{" "}
                    <button
                      type="button"
                      className="text-link"
                      disabled={!current?.active}
                      onClick={() => {
                        if (current)
                          update(item.id, {
                            ...draftPiece(current, customer),
                            id: item.id,
                            quantity: item.quantity,
                            material: item.material,
                          });
                      }}
                    >
                      Reload garment settings and sizes
                    </button>
                  </div>
                )}
                <DesignChoices
                  key={`${item.id}-${item.garment.id}-${item.garment.revision}`}
                  garment={item.garment}
                  value={item.design}
                  onChange={(design) => update(item.id, { design })}
                />
                <div className={styles.measureHead}>
                  <strong>
                    {item.garment.name} measurements ·{" "}
                    {item.garment.unit === "in" ? "inches" : "cm"}
                  </strong>
                  {profile && (
                    <span className="muted small">
                      Saved{" "}
                      {new Date(profile.snapshot.recordedAt).toLocaleDateString(
                        "en-IN",
                      )}{" "}
                      · profile version {profile.revision}
                    </span>
                  )}
                </div>
                {profile && (
                  <p className="muted small">
                    Saved sizes are filled where the fields and units match.
                    Review them for this order.
                  </p>
                )}
                <div className={styles.row}>
                  {profile && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        measures(item, {
                          values: compatibleValues(item.garment, customer),
                          extraFields: [],
                          source: "profile",
                          expectedProfileRevision: profile.revision,
                          confirmed: false,
                        })
                      }
                    >
                      Reload saved profile
                    </button>
                  )}
                  {customer &&
                    Object.keys(customer.measurements).length > 0 &&
                    item.garment.id === "garment-blouse" &&
                    !profile && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() =>
                          measures(item, {
                            values: legacyValues(item.garment, customer),
                            source: "legacy",
                            confirmed: false,
                          })
                        }
                      >
                        Copy legacy blouse sizes for review
                      </button>
                    )}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      measures(item, {
                        values: {},
                        source: "new",
                        confirmed: !fields.length,
                      })
                    }
                  >
                    Enter new measurements
                  </button>
                </div>
                {item.garment.presets.length > 0 && (
                  <label className="field">
                    Use a size preset (optional)
                    <select
                      value=""
                      onChange={(e) => {
                        const preset = item.garment.presets.find(
                          (p) => p.id === e.target.value,
                        );
                        if (preset)
                          measures(item, {
                            values: { ...preset.values },
                            extraFields: [],
                            source: "preset",
                            confirmed: false,
                          });
                      }}
                    >
                      <option value="">Choose a shop size…</option>
                      {item.garment.presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {fields.length ? (
                  <MeasurementFields
                    fields={fields}
                    values={item.measurements.values}
                    unit={item.garment.unit}
                    required={item.measurements.confirmed}
                    onChange={(values) =>
                      measures(item, { values, confirmed: false })
                    }
                  />
                ) : (
                  <p className="note-box">
                    This service has no measurement fields.
                  </p>
                )}
                {fields.length < 40 &&
                  item.measurements.extraFields.length < 10 && (
                    <AddMeasurementField
                      unit={item.garment.unit}
                      existingLabels={fields.map((f) => f.label)}
                      onAdd={(field) =>
                        measures(item, {
                          extraFields: [
                            ...item.measurements.extraFields,
                            field,
                          ],
                          confirmed: false,
                        })
                      }
                    />
                  )}
                {item.measurements.extraFields.length > 0 && (
                  <div className={styles.row}>
                    {item.measurements.extraFields.map((field) => (
                      <button
                        type="button"
                        className="text-link"
                        key={field.id}
                        onClick={() =>
                          measures(item, {
                            extraFields: item.measurements.extraFields.filter(
                              (f) => f.id !== field.id,
                            ),
                            values: Object.fromEntries(
                              Object.entries(item.measurements.values).filter(
                                ([id]) => id !== field.id,
                              ),
                            ),
                            confirmed: false,
                          })
                        }
                      >
                        Remove extra {field.label}
                      </button>
                    ))}
                  </div>
                )}
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={item.measurements.confirmed}
                    onChange={(e) =>
                      measures(item, { confirmed: e.target.checked })
                    }
                  />{" "}
                  Measurements reviewed and ready for cutting
                </label>
                {!item.measurements.confirmed && (
                  <p className={styles.pending}>
                    You can save now. This piece will wait for measurements
                    before production.
                  </p>
                )}
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={item.measurements.saveProfile}
                    onChange={(e) =>
                      measures(item, { saveProfile: e.target.checked })
                    }
                  />{" "}
                  Also save confirmed sizes to this customer’s{" "}
                  {item.garment.name} profile
                </label>
              </section>
            );
          })}
          <button
            className="button"
            type="button"
            disabled={count >= 50}
            onClick={() =>
              setItems([
                ...items,
                draftPiece(
                  initialGarment,
                  customer,
                  !profileFor(customer, initialGarment.id) &&
                    !items.some(
                      (row) =>
                        row.garment.id === initialGarment.id &&
                        row.measurements.saveProfile,
                    ),
                ),
              ])
            }
          >
            + Add garment
          </button>
          <Link
            className="text-link"
            href="/settings"
            target="_blank"
            style={{ marginLeft: 14 }}
          >
            Manage garment templates ↗
          </Link>
        </section>
        <section className="panel form-panel">
          <div className="form-section-title">
            <span>03</span>
            <h2>Delivery & payment</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              Delivery date
              <input
                required
                type="date"
                name="dueDate"
                min={today}
                defaultValue={offsetDate(catalogue.leadDays)}
              />
            </label>
            <label className="field">
              Priority
              <select name="priority" defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="field">
              Advance received (₹, optional)
              <input
                type="number"
                min={0}
                max={quoted / 100}
                step="0.01"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
              />
            </label>
            <label className="field">
              Payment method
              <select name="method" disabled={!payment}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank transfer</option>
              </select>
            </label>
            <label className="field full-width">
              Order notes (optional)
              <textarea name="notes" maxLength={2000} />
            </label>
          </div>
        </section>
      </fieldset>
      <aside className="panel order-summary">
        <h2>Order summary</h2>
        <p className="muted">
          {customer?.name ?? "New customer"} · {count} pieces
        </p>
        {items.map((item) => (
          <div className="summary-line" key={item.id}>
            <span>
              {item.quantity} × {item.garment.name}
              <small style={{ display: "block", marginTop: 5 }}>
                {workflowForGarment(catalogue, item.garment).name}:{" "}
                {workflowForGarment(catalogue, item.garment)
                  .steps.map((s) => s.name)
                  .join(" → ")}
              </small>
            </span>
            <strong>
              {money(Math.round(Number(item.price || 0) * 100) * item.quantity)}
            </strong>
          </div>
        ))}
        <GstSummary gst={gst} />
        <div className="summary-line">
          <span>Total</span>
          <strong>{money(quoted)}</strong>
        </div>
        <div className="summary-line">
          <span>Advance</span>
          <strong>{money(payment)}</strong>
        </div>
        <div className="summary-line total">
          <span>Balance</span>
          <strong>{money(quoted - payment)}</strong>
        </div>
        {items.some((i) => !i.measurements.confirmed) && (
          <p className={styles.pending}>
            Some pieces will wait for measurements.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary"
          disabled={busy || count > 50 || count < 1}
        >
          {busy ? "Saving…" : "Save order"}
        </button>
        <p className="muted small" style={{ marginTop: 12 }}>
          {mode === "preview"
            ? "Sample workspace: changes last until refresh."
            : "Customer, confirmed profiles and order are saved together."}
        </p>
      </aside>
    </form>
  );
}
