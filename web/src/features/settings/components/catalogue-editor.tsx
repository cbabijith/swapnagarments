"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Pencil,
  Ellipsis,
  Copy,
  Archive,
  ArchiveRestore,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { QueryState, ScrollPagination } from "@/shared/components/query-state";
import { useCatalogue } from "../hooks/use-catalogue";
import { useSaveCatalogue } from "../hooks/use-save-catalogue";
import type { Catalogue, Garment } from "../contracts/catalogue";
import { money } from "@/shared/workspace";
import { GarmentEditor } from "./garment-editor";
import { DefaultsEditor } from "./defaults-editor";
import { GarmentImage } from "@/features/design-library/components/asset-image";
import { garmentImage } from "@/features/design-library/domain/designs";
import { resolveGarmentIllustration } from "../domain/garment-illustrations";
import styles from "./catalogue.module.css";

type Editor = { base: Catalogue; garment: Garment; isNew: boolean };
export function CatalogueSettings({
  section,
}: {
  section: "garments" | "defaults";
}) {
  const read = useCatalogue(),
    write = useSaveCatalogue();
  const [editor, setEditor] = useState<Editor | null>(null),
    [defaults, setDefaults] = useState<Catalogue | null>(null);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("active"),
    [page, setPage] = useState(1);
  const catalogue = read.data?.catalogue;
  const blocked = write.busy || read.isRefreshing;
  function edit(garment: Garment, isNew = false) {
    if (catalogue)
      setEditor({
        base: structuredClone(catalogue),
        garment: structuredClone(garment),
        isNew,
      });
  }
  function add() {
    edit(
      {
        id: crypto.randomUUID(),
        revision: 1,
        name: "",
        active: true,
        price: null,
        unit: "in",
        fields: [],
        presets: [],
      },
      true,
    );
  }
  function duplicate(garment: Garment) {
    let name = `${garment.name} copy`,
      index = 2;
    while (
      catalogue?.garments.some(
        (g) => g.name.toLowerCase() === name.toLowerCase(),
      )
    )
      name = `${garment.name} copy ${index++}`;
    edit(
      {
        ...structuredClone(garment),
        illustrationId: resolveGarmentIllustration(garment),
        image: garmentImage(garment),
        id: crypto.randomUUID(),
        revision: 1,
        name,
        active: true,
      },
      true,
    );
  }
  async function listChange(
    garment: Garment,
    action: "up" | "down" | "archive",
  ) {
    if (!catalogue || blocked) return;
    const next = structuredClone(catalogue),
      index = next.garments.findIndex((g) => g.id === garment.id);
    if (action === "archive") next.garments[index].active = !garment.active;
    else {
      const to = index + (action === "up" ? -1 : 1);
      if (to < 0 || to >= next.garments.length) return;
      [next.garments[index], next.garments[to]] = [
        next.garments[to],
        next.garments[index],
      ];
    }
    if (
      !(await write.save(
        next,
        action === "archive"
          ? `${garment.name} ${garment.active ? "archived" : "restored"}.`
          : "Garment order updated.",
      ))
    )
      read.reload();
  }
  const matches =
    catalogue?.garments.filter(
      (g) =>
        g.name.toLowerCase().includes(query.trim().toLowerCase()) &&
        (filter === "all" || g.active === (filter === "active")),
    ) ?? [];
  const pageSize = 7,
    pageCount = Math.max(1, Math.ceil(matches.length / pageSize)),
    visiblePage = Math.min(page, pageCount);
  const defaultGarment = catalogue?.garments.find(
    (g) => g.id === catalogue.defaultGarmentId,
  );
  return (
    <>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      {catalogue &&
        (section === "defaults" ? (
          <section className={`panel ${styles.defaultsPanel}`}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Start every order one step ahead</h2>
                <p>Choose what is filled in when you create an order.</p>
              </div>
              <button
                type="button"
                className="button primary"
                disabled={blocked}
                onClick={() => setDefaults(structuredClone(catalogue))}
              >
                <Pencil size={15} />
                Edit defaults
              </button>
            </div>
            <div className={styles.defaultCards}>
              <div>
                <GarmentImage garment={defaultGarment ?? { name: "" }} />
                <small>DEFAULT GARMENT</small>
                <h3>{defaultGarment?.name}</h3>
                <p>
                  {defaultGarment?.price
                    ? `${money(defaultGarment.price)} per piece`
                    : "Price entered in each order"}
                </p>
              </div>
              <div>
                <span className={styles.tileIcon}>
                  <CalendarDays size={21} />
                </span>
                <small>SUGGESTED DELIVERY</small>
                <h3>
                  {catalogue.leadDays === 0
                    ? "Same day"
                    : `${catalogue.leadDays} days later`}
                </h3>
                <p>You can change the date for each order.</p>
              </div>
            </div>
            <p className={styles.footnote}>
              Saved customer sizes are offered for review. Size presets are
              applied when you choose them.
            </p>
          </section>
        ) : (
          <section
            className={`panel ${styles.catalogue}`}
            aria-label="Garment catalogue"
          >
            <div className={styles.sectionHead}>
              <div>
                <h2>
                  Garments & services{" "}
                  <span className={styles.count}>
                    {catalogue.garments.filter((g) => g.active).length} active
                  </span>
                </h2>
                <p>
                  Names, prices and measurement templates for what you stitch.
                </p>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={add}
                disabled={blocked || catalogue.garments.length >= 50}
              >
                <Plus size={17} />
                Add garment
              </button>
            </div>
            <div className={styles.filters}>
              <label className={styles.search}>
                <Search size={17} />
                <input
                  aria-label="Search garments"
                  placeholder="Find a garment or service…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                    aria-label="Clear garment search"
                  >
                    ×
                  </button>
                )}
              </label>
              <select
                aria-label="Show garments"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="active">Active garments</option>
                <option value="archived">Archived garments</option>
                <option value="all">All garments</option>
              </select>
            </div>
            {write.error && (
              <p className={`form-error ${styles.listError}`} role="alert">
                {write.error}
              </p>
            )}
            <div className={styles.listHeading} aria-hidden="true">
              <span>Garment / service</span>
              <span>Measurement template</span>
              <span>Default price</span>
              <span />
            </div>
            <ul className={styles.garmentList}>
              {matches.slice(0, visiblePage * pageSize).map((garment) => {
                const index = catalogue.garments.findIndex(
                  (g) => g.id === garment.id,
                );
                return (
                  <li key={garment.id} className={styles.garmentRow}>
                    <div className={styles.garmentIdentity}>
                      <GarmentImage garment={garment} size={44} />
                      <div>
                        <button
                          type="button"
                          className={styles.nameButton}
                          disabled={blocked}
                          onClick={() => edit(garment)}
                        >
                          {garment.name}
                        </button>
                        <div className={styles.badges}>
                          {garment.id === catalogue.defaultGarmentId && (
                            <span>Default</span>
                          )}
                          {!garment.active && (
                            <span className={styles.archived}>Archived</span>
                          )}
                          <small className={styles.mobileMeta}>
                            {garment.fields.length
                              ? `${garment.fields.length} fields · ${garment.unit === "in" ? "inches" : "cm"}`
                              : "No measurements"}
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className={styles.templateMeta}>
                      <strong>
                        {garment.fields.length
                          ? `${garment.fields.length} fields`
                          : "No measurements"}
                      </strong>
                      <small>
                        {garment.unit === "in" ? "Inches" : "Centimetres"}
                        {garment.presets.length
                          ? ` · ${garment.presets.length} size presets`
                          : ""}
                      </small>
                    </div>
                    <span className={styles.price}>
                      {garment.price ? (
                        money(garment.price)
                      ) : (
                        <small>Set per order</small>
                      )}
                    </span>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.editButton}
                        aria-label={`Edit ${garment.name}`}
                        disabled={blocked}
                        onClick={() => edit(garment)}
                      >
                        <Pencil size={15} />
                        <span>Edit</span>
                      </button>
                      <details
                        className={styles.more}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget))
                            e.currentTarget.open = false;
                        }}
                      >
                        <summary
                          aria-label={`More actions for ${garment.name}`}
                          aria-disabled={blocked}
                          onClick={(e) => {
                            if (blocked) e.preventDefault();
                          }}
                        >
                          <Ellipsis size={19} />
                        </summary>
                        <div
                          className={styles.menu}
                          onClick={(e) => {
                            const details = e.currentTarget.closest("details");
                            if (details) details.open = false;
                          }}
                        >
                          <button
                            type="button"
                            disabled={
                              blocked || catalogue.garments.length >= 50
                            }
                            onClick={() => duplicate(garment)}
                          >
                            <Copy size={15} />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            disabled={blocked || index === 0}
                            onClick={() => void listChange(garment, "up")}
                          >
                            <ArrowUp size={15} />
                            Move up
                          </button>
                          <button
                            type="button"
                            disabled={
                              blocked || index === catalogue.garments.length - 1
                            }
                            onClick={() => void listChange(garment, "down")}
                          >
                            <ArrowDown size={15} />
                            Move down
                          </button>
                          <button
                            type="button"
                            disabled={
                              blocked ||
                              garment.id === catalogue.defaultGarmentId
                            }
                            title={
                              garment.id === catalogue.defaultGarmentId
                                ? "Choose another default garment first"
                                : undefined
                            }
                            onClick={() => void listChange(garment, "archive")}
                          >
                            {garment.active ? (
                              <Archive size={15} />
                            ) : (
                              <ArchiveRestore size={15} />
                            )}
                            {garment.active ? "Archive" : "Restore"}
                          </button>
                        </div>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ul>
            {!matches.length && (
              <div className={styles.empty}>
                <Search size={25} />
                <h3>
                  {query ? "No matching garments" : "No garments in this view"}
                </h3>
                <p>
                  {query
                    ? "Try a shorter name, or add a new garment."
                    : "Choose another view or add what you stitch."}
                </p>
                {query && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
            {pageCount > 1 && (
              <ScrollPagination
                page={{
                  page: visiblePage,
                  pageSize,
                  total: matches.length,
                  pageCount,
                }}
                onPageChange={setPage}
                disabled={blocked}
              />
            )}
            <div className={styles.catalogueFoot}>
              <span>
                Changes apply to new orders. Existing pieces keep their details.
              </span>
              <Link href="/orders/new" className="text-link">
                Create an order
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
        ))}
      {catalogue && editor && (
        <GarmentEditor
          initial={editor.garment}
          base={editor.base}
          current={catalogue}
          isNew={editor.isNew}
          onClose={() => setEditor(null)}
          onRefresh={read.reload}
        />
      )}
      {catalogue && defaults && (
        <DefaultsEditor
          base={defaults}
          current={catalogue}
          onClose={() => setDefaults(null)}
          onRefresh={read.reload}
        />
      )}
    </>
  );
}
