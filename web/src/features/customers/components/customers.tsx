"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowLeft,
  Ruler,
  Pencil,
  Check,
} from "lucide-react";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import {
  useCustomerDirectory,
  useCustomerDetail,
} from "@/features/customers/hooks/use-customer-reads";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import { QueryState, Pagination } from "@/shared/components/query-state";
import {
  Avatar,
  Dialog,
  EmptyState,
  PageHeading,
  SectionHeading,
  StatusBadge,
} from "@/shared/components/ui";
import { type Customer, money, total, formatDate } from "@/shared/workspace";

function CustomerForm({
  customer,
  onClose,
}: {
  customer?: Customer;
  onClose: () => void;
}) {
  const { saveCustomer } = useCustomers();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const phone = String(form.get("phone")).trim();
      if (!/^\+?[\d\s-]{10,16}$/.test(phone))
        throw new Error("Please enter a valid phone number.");
      await saveCustomer({
        id: customer?.id ?? crypto.randomUUID(),
        name: String(form.get("name")).trim(),
        phone,
        email: String(form.get("email") ?? "").trim(),
        notes: String(form.get("notes") ?? ""),
        measurements: customer?.measurements ?? {},
      });
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save the customer.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={customer ? "The customer details" : "A new face at the studio"}
      subtitle="A little care begins with knowing your customer."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="dialog-body form-grid">
          <label className="field full-width">
            Full name
            <input
              autoFocus
              name="name"
              defaultValue={customer?.name}
              required
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label className="field">
            Phone number
            <input
              name="phone"
              defaultValue={customer?.phone}
              required
              type="tel"
              maxLength={16}
              autoComplete="tel"
            />
          </label>
          <label className="field">
            Email (optional)
            <input
              name="email"
              defaultValue={customer?.email}
              type="email"
              maxLength={150}
              autoComplete="email"
            />
          </label>
          <label className="field full-width">
            Customer notes
            <textarea
              name="notes"
              defaultValue={customer?.notes}
              maxLength={2000}
              placeholder="Fit preferences, fabric notes, or anything useful."
            />
          </label>
          {error && (
            <p className="form-error full-width" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            <Check size={16} />
            {busy ? "Saving…" : "Save customer"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function CustomersList() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(query);
  const [add, setAdd] = useState(false);
  const read = useCustomerDirectory(search, page);
  const customers = read.data?.data.customers ?? [];
  return (
    <>
      <PageHeading
        eyebrow="FAMILIAR FACES. THOUGHTFUL DETAILS."
        title="The people we make for."
        description="Keep measurements, preferences, and every past order close at hand."
      >
        <button className="button primary" onClick={() => setAdd(true)}>
          <Plus size={17} />
          New customer
        </button>
      </PageHeading>
      <div className="toolbar" style={{ padding: "0 0 23px", border: 0 }}>
        <label className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            maxLength={160}
            placeholder="Search by name or phone"
            aria-label="Search customers"
          />
        </label>
        {read.data && (
          <span className="muted small">{read.data.page.total} customers</span>
        )}
      </div>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      <div className="customer-grid">
        {customers.map((customer, index) => (
          <Link
            key={customer.id}
            href={`/customers/${customer.id}`}
            className="panel customer-card"
          >
            <Avatar
              name={customer.name}
              tone={["sage", "peach", "lilac", "rose", "sand"][index % 5]}
            />
            <h2>{customer.name}</h2>
            <p>{customer.phone}</p>
            <div className="customer-card-foot">
              <span>
                {read.data?.orderCounts[customer.id] ?? 0} orders ·{" "}
                {Object.keys(customer.measurements).length
                  ? "Measurements saved"
                  : "No measurements yet"}
              </span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </div>
      {!read.isLoading && !read.error && !customers.length && (
        <EmptyState
          title="No customers found"
          text="Try another name or add a new customer."
        />
      )}
      {read.data && <Pagination page={read.data.page} onPageChange={setPage} />}
      {add && <CustomerForm onClose={() => setAdd(false)} />}
    </>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const { saveCustomer } = useCustomers();
  const [page, setPage] = useState(1);
  const read = useCustomerDetail(id, page);
  const [edit, setEdit] = useState(false);
  const [measurements, setMeasurements] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const customer = read.data?.data.customers.find((entry) => entry.id === id);
  if (!customer && (read.isLoading || read.error))
    return (
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
    );
  if (!customer)
    return (
      <EmptyState
        title="Customer not found"
        text="Choose a customer from the directory."
      >
        <Link className="button" href="/customers">
          Back to customers
        </Link>
      </EmptyState>
    );
  const orders = read.data?.data.orders ?? [];
  return (
    <>
      <Link className="back-link" href="/customers">
        <ArrowLeft size={14} />
        Back to customers
      </Link>
      <PageHeading
        eyebrow="A FIT THAT FEELS FAMILIAR"
        title={customer.name}
        description={`${customer.phone}${customer.email ? ` · ${customer.email}` : ""}`}
      >
        <button className="button" onClick={() => setEdit(true)}>
          <Pencil size={16} />
          Edit details
        </button>
      </PageHeading>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      <div className="detail-columns">
        <div className="stack">
          <section className="panel">
            <SectionHeading
              title="Blouse measurements"
              subtitle="Saved in inches. Confirm the fit with the customer for each new order."
            />
            <div className="padded" style={{ paddingTop: 0 }}>
              <div className="measurement-grid">
                {Object.entries(customer.measurements).map(([label, value]) => (
                  <div className="measurement-box" key={label}>
                    <span>{label}</span>
                    <strong>{value}″</strong>
                  </div>
                ))}
              </div>
              {!Object.keys(customer.measurements).length && (
                <p className="note-box">No measurements saved yet.</p>
              )}
              <button className="button" onClick={() => setMeasurements(true)}>
                <Ruler size={16} />
                {Object.keys(customer.measurements).length
                  ? "Update measurements"
                  : "Add measurements"}
              </button>
            </div>
          </section>
          <section className="panel">
            <SectionHeading
              title="Every order, remembered"
              subtitle={`${read.data?.orderCounts[id] ?? 0} orders with the studio`}
            />
            {orders.map((order) => (
              <Link
                key={order.id}
                className="mobile-order-card"
                style={{ display: "block" }}
                href={`/orders/${order.id}`}
              >
                <div
                  className="inline-row"
                  style={{ justifyContent: "space-between" }}
                >
                  <strong>{order.number}</strong>
                  <StatusBadge status={order.status} />
                  <ArrowUpRight size={16} />
                </div>
                <p className="muted small" style={{ marginTop: 10 }}>
                  {order.items.map((item) => item.garment).join(", ")} ·{" "}
                  {formatDate(order.createdAt)} · {money(total(order))}
                </p>
              </Link>
            ))}
            {!read.isLoading && !read.error && !orders.length && (
              <EmptyState
                title="The first chapter awaits"
                text="This customer has no orders yet."
              />
            )}
            {read.data && (
              <Pagination page={read.data.page} onPageChange={setPage} />
            )}
          </section>
        </div>
        <aside className="panel padded">
          <SectionHeading title="The little preferences" />
          <p className="note-box">
            {customer.notes ||
              "No special preferences saved. You can add them by editing the customer details."}
          </p>
        </aside>
      </div>
      {edit && (
        <CustomerForm customer={customer} onClose={() => setEdit(false)} />
      )}
      {measurements && (
        <Dialog
          title="A few careful measurements"
          subtitle="Blouse profile · all measurements are in inches."
          onClose={() => setMeasurements(false)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setBusy(true);
              const form = new FormData(event.currentTarget);
              const values = Object.fromEntries(
                [...form.entries()]
                  .map(([key, value]) => [key, String(value)])
                  .filter(([, value]) => value !== ""),
              );
              try {
                await saveCustomer({ ...customer, measurements: values });
                setMeasurements(false);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not save measurements.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="dialog-body form-grid">
              {[
                "Bust",
                "Waist",
                "Shoulder",
                "Sleeve length",
                "Blouse length",
                "Neck depth",
              ].map((label) => (
                <label className="field" key={label}>
                  {label} (in)
                  <input
                    name={label}
                    defaultValue={customer.measurements[label]}
                    type="number"
                    min="0.25"
                    max="150"
                    step="0.25"
                    inputMode="decimal"
                    placeholder="—"
                  />
                </label>
              ))}
              {error && (
                <p className="form-error full-width" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="dialog-actions">
              <button className="button primary" disabled={busy}>
                Save measurements
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
