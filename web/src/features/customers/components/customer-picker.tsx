"use client";

import { useId, useRef, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import { useCustomerDirectory } from "@/features/customers/hooks/use-customer-reads";
import { useDebouncedValue } from "@/shared/hooks/use-feature-query";
import type { Customer } from "@/shared/workspace";
import styles from "./customer-picker.module.css";

type CustomerPickerProps = {
  value: Customer | null;
  onSelect: (customer: Customer) => void;
  onAddNew: (query: string) => void;
  disabled?: boolean;
};

function CustomerSearch({
  value,
  onSelect,
  onAddNew,
  disabled,
  autoFocus,
}: CustomerPickerProps & { autoFocus: boolean }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const directory = useCustomerDirectory(debouncedQuery, 1, 5);
  const inputId = useId();
  const resultsId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const firstResultRef = useRef<HTMLButtonElement>(null);
  const searching =
    query.trim() !== debouncedQuery.trim() || directory.isLoading;
  const customers = directory.data?.data.customers.slice(0, 5) ?? [];

  return (
    <div className={styles.searchPanel}>
      <label className={styles.label} htmlFor={inputId}>
        {value ? "Find another customer" : "Customer"}
      </label>
      <div className={styles.searchBox}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Searching inside the order form must not submit that form.
              event.preventDefault();
              if (!searching && !directory.error)
                firstResultRef.current?.focus();
            }
          }}
          placeholder="Search by name or phone"
          maxLength={160}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-controls={resultsId}
        />
        {query && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear customer search"
            disabled={disabled}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
      </div>
      <div id={resultsId} aria-busy={searching || directory.isRefreshing}>
        {searching ? (
          <p className={styles.message} role="status">
            Finding customers…
          </p>
        ) : directory.error ? (
          <div className={styles.error} role="alert">
            <p>{directory.error}</p>
            <button
              type="button"
              className={styles.textButton}
              disabled={disabled}
              onClick={directory.reload}
            >
              Try again
            </button>
          </div>
        ) : customers.length ? (
          <>
            <ul className={styles.results} aria-label="Customers">
              {customers.map((customer, index) => (
                <li key={customer.id}>
                  <button
                    ref={index === 0 ? firstResultRef : undefined}
                    type="button"
                    className={styles.customerButton}
                    disabled={disabled}
                    onClick={() => onSelect(customer)}
                  >
                    <span className={styles.avatar} aria-hidden="true">
                      <UserRound size={18} />
                    </span>
                    <span className={styles.customerText}>
                      <strong>{customer.name}</strong>
                      <span>{customer.phone}</span>
                    </span>
                    {value?.id === customer.id && (
                      <span className={styles.current}>
                        <Check size={16} aria-hidden="true" />
                        <span className="sr-only">Selected customer</span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {(directory.data?.page.total ?? 0) > 5 && (
              <p className={styles.hint}>
                Showing 5 customers. Type more to narrow the list.
              </p>
            )}
          </>
        ) : (
          <p className={styles.message} role="status">
            {debouncedQuery.trim()
              ? "No customers found. Try another name or phone number."
              : "No customers yet. Add your first customer below."}
          </p>
        )}
      </div>
      <button
        type="button"
        className={styles.addButton}
        disabled={disabled}
        onClick={() => onAddNew(query.trim())}
      >
        <Plus size={17} aria-hidden="true" />
        Add new customer
      </button>
    </div>
  );
}

export function CustomerPicker({
  value,
  onSelect,
  onAddNew,
  disabled = false,
}: CustomerPickerProps) {
  const [changing, setChanging] = useState(false);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const choosing = !value || changing;

  return (
    <div className={styles.picker}>
      {value && (
        <div className={styles.selectedCard}>
          <span className={styles.selectedMark} aria-hidden="true">
            <Check size={18} />
          </span>
          <div className={styles.customerText}>
            <span className={styles.selectedLabel}>Selected customer</span>
            <strong>{value.name}</strong>
            <span>{value.phone}</span>
          </div>
          <button
            ref={changeButtonRef}
            type="button"
            className={styles.textButton}
            disabled={disabled}
            aria-expanded={choosing}
            onClick={() => setChanging(!changing)}
          >
            {changing ? "Cancel" : "Change"}
          </button>
        </div>
      )}
      {choosing && (
        <CustomerSearch
          value={value}
          disabled={disabled}
          autoFocus={changing}
          onSelect={(customer) => {
            onSelect(customer);
            setChanging(false);
            window.requestAnimationFrame(() =>
              changeButtonRef.current?.focus(),
            );
          }}
          onAddNew={(query) => {
            setChanging(false);
            onAddNew(query);
          }}
        />
      )}
    </div>
  );
}
