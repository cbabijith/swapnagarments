"use client";
import { useId, useRef, useState } from "react";
import { Dialog } from "@/shared/components/ui";
import { money } from "@/shared/workspace";
import type { Garment } from "../contracts/catalogue";
import { resolveGarmentIllustration } from "../domain/garment-illustrations";
import { GarmentIllustration } from "./garment-illustration";
import styles from "./garment-visuals.module.css";

export function GarmentPicker({
  selected,
  garments,
  onChange,
}: {
  selected: Garment;
  garments: Garment[];
  onChange: (garment: Garment) => void;
}) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const active = garments.filter((garment) => garment.active);
  const visible = active.filter((garment) =>
    garment.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return (
    <div className="field">
      <label htmlFor={id}>Garment</label>
      <div className={styles.selectRow}>
        <GarmentIllustration
          illustrationId={resolveGarmentIllustration(selected)}
          size={44}
        />
        <select
          id={id}
          value={selected.id}
          onChange={(event) => {
            const garment = active.find(
              (option) => option.id === event.target.value,
            );
            if (garment) onChange(garment);
          }}
        >
          {!active.some((garment) => garment.id === selected.id) && (
            <option value={selected.id} disabled>
              {selected.name} (archived)
            </option>
          )}
          {active.map((garment) => (
            <option value={garment.id} key={garment.id}>
              {garment.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className={styles.browse}
        ref={trigger}
        aria-haspopup="dialog"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        Choose by image
      </button>
      {open && (
        <Dialog
          title="Choose a garment"
          subtitle="Select the garment you want to stitch."
          onClose={close}
          className={styles.pickerDialog}
        >
          <div className={styles.pickerBody}>
            <label className="field">
              Search garment images
              <input
                autoFocus
                type="search"
                value={query}
                placeholder="Search by garment name"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
              />
            </label>
            <div className={styles.imageGrid}>
              {visible.map((garment) => (
                <button
                  key={garment.id}
                  type="button"
                  className={styles.garmentChoice}
                  aria-label={`Choose ${garment.name}`}
                  aria-pressed={selected.id === garment.id}
                  onClick={() => {
                    if (
                      garment.id !== selected.id ||
                      garment.revision !== selected.revision
                    )
                      onChange(garment);
                    close();
                  }}
                >
                  <GarmentIllustration
                    illustrationId={resolveGarmentIllustration(garment)}
                    size={80}
                  />
                  <strong>{garment.name}</strong>
                  <small>
                    {garment.price === null
                      ? "Price entered per order"
                      : `${money(garment.price)} per piece`}
                  </small>
                </button>
              ))}
            </div>
            {!visible.length && (
              <p className={styles.empty} role="status">
                No garments match “{query}”. Try another name.
              </p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
