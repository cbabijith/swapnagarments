"use client";
import { useState } from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Copy,
  Archive,
  RotateCcw,
  GitBranch,
} from "lucide-react";
import { Dialog } from "@/shared/components/ui";
import { QueryState } from "@/shared/components/query-state";
import { useCatalogue } from "@/features/settings/hooks/use-catalogue";
import { useSaveCatalogue } from "@/features/settings/hooks/use-save-catalogue";
import type { Catalogue } from "@/features/settings/contracts/catalogue";
import { GarmentImage } from "@/features/design-library/components/asset-image";
import { STATIONS } from "@/shared/workspace";
import { workflowsFor } from "../domain/templates";
import {
  workflowTemplateSchema,
  type WorkflowTemplate,
} from "../contracts/settings";
import styles from "./workflow-settings.module.css";

export function WorkflowSettings() {
  const read = useCatalogue(),
    write = useSaveCatalogue();
  const [editor, setEditor] = useState<{
    base: Catalogue;
    template: WorkflowTemplate;
    isNew: boolean;
  } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const catalogue = read.data?.catalogue;
  const settings = catalogue ? workflowsFor(catalogue) : undefined;
  const blocked = write.busy || read.isRefreshing;
  function edit(template?: WorkflowTemplate, duplicate = false) {
    if (!catalogue) return;
    write.setError("");
    const value: WorkflowTemplate = template
      ? structuredClone(template)
      : {
          id: crypto.randomUUID(),
          name: "",
          revision: 1,
          active: true,
          steps: [{ id: crypto.randomUUID(), name: "", station: 0 }],
        };
    if (duplicate) {
      value.id = crypto.randomUUID();
      value.name = `${value.name} copy`.slice(0, 80);
      value.revision = 1;
      value.active = true;
    }
    setEditor({
      base: structuredClone(catalogue),
      template: value,
      isNew: !template || duplicate,
    });
  }
  async function toggle(template: WorkflowTemplate) {
    if (!catalogue || !settings) return;
    const next = structuredClone(catalogue);
    next.workflows = structuredClone(settings);
    next.workflows.templates.find((t) => t.id === template.id)!.active =
      !template.active;
    if (template.active)
      next.garments = next.garments.map((g) =>
        g.workflowId === template.id ? { ...g, workflowId: undefined } : g,
      );
    await write.save(
      next,
      `${template.name} ${template.active ? "archived. New orders use the default workflow." : "restored."}`,
    );
  }
  return (
    <div className={styles.settings}>
      <QueryState
        loading={read.isLoading}
        error={read.error}
        retry={read.reload}
      />
      <section className={`panel ${styles.panel}`}>
        <div className={styles.heading}>
          <div>
            <h2>Workflows</h2>
            <p>The steps your team follows to finish each garment.</p>
          </div>
          <button
            type="button"
            className="button primary"
            disabled={
              !catalogue || blocked || (settings?.templates.length ?? 0) >= 30
            }
            onClick={() => edit()}
          >
            <Plus size={16} />
            Add workflow
          </button>
        </div>
        <p className={styles.hint}>
          Create the steps once, then reuse them. Changes apply to new orders;
          existing orders keep their saved steps.
        </p>
        {settings && catalogue && (
          <>
            <div className={styles.controls}>
              <label className="field">
                Default workflow
                <select
                  aria-label="Default workflow"
                  disabled={blocked}
                  value={settings.defaultWorkflowId}
                  onChange={(e) =>
                    void write.save(
                      {
                        ...catalogue,
                        workflows: {
                          ...settings,
                          defaultWorkflowId: e.target.value,
                        },
                      },
                      "Default workflow saved.",
                    )
                  }
                >
                  {settings.templates
                    .filter((t) => t.active)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <small>Used unless a garment has its own workflow.</small>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show archived workflows
              </label>
            </div>
            <div className={styles.cards}>
              {settings.templates
                .filter((t) => t.active || showArchived)
                .map((template) => (
                  <article className={styles.card} key={template.id}>
                    <div className={styles.cardTitle}>
                      <GitBranch size={20} />
                      <h3>{template.name}</h3>
                      {template.id === settings.defaultWorkflowId && (
                        <span>Default</span>
                      )}
                      {!template.active && <span>Archived</span>}
                    </div>
                    <ol className={styles.flow}>
                      {template.steps.map((step) => (
                        <li key={step.id}>{step.name}</li>
                      ))}
                    </ol>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className="button"
                        disabled={blocked}
                        onClick={() => edit(template)}
                        aria-label={`Edit ${template.name}`}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button"
                        disabled={blocked || settings.templates.length >= 30}
                        onClick={() => edit(template, true)}
                        aria-label={`Duplicate ${template.name}`}
                      >
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="text-link"
                        disabled={
                          blocked || template.id === settings.defaultWorkflowId
                        }
                        title={
                          template.id === settings.defaultWorkflowId
                            ? "Choose another default before archiving this workflow"
                            : undefined
                        }
                        onClick={() => void toggle(template)}
                        aria-label={`${template.active ? "Archive" : "Restore"} ${template.name}`}
                      >
                        {template.active ? (
                          <Archive size={14} />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        {template.active ? "Archive" : "Restore"}
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </>
        )}
        {write.error && (
          <p className="form-error" role="alert">
            {write.error}
          </p>
        )}
      </section>
      {settings && catalogue && (
        <section className={`panel ${styles.panel}`}>
          <div className={styles.heading}>
            <div>
              <h2>Workflow for each garment</h2>
              <p>Keep the default, or choose a different set of steps.</p>
            </div>
          </div>
          <div className={styles.garments}>
            {catalogue.garments
              .filter((g) => g.active)
              .map((garment) => (
                <label className={styles.garment} key={garment.id}>
                  <GarmentImage garment={garment} size={40} />
                  <strong>{garment.name}</strong>
                  <select
                    aria-label={`Workflow for ${garment.name}`}
                    disabled={blocked}
                    value={garment.workflowId ?? ""}
                    onChange={(e) =>
                      void write.save(
                        {
                          ...catalogue,
                          workflows: settings,
                          garments: catalogue.garments.map((g) =>
                            g.id === garment.id
                              ? {
                                  ...g,
                                  workflowId: e.target.value || undefined,
                                }
                              : g,
                          ),
                        },
                        `Workflow saved for ${garment.name}.`,
                      )
                    }
                  >
                    <option value="">
                      Shop default ·{" "}
                      {
                        settings.templates.find(
                          (t) => t.id === settings.defaultWorkflowId,
                        )?.name
                      }
                    </option>
                    {settings.templates
                      .filter((t) => t.active)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
          </div>
        </section>
      )}
      {editor && (
        <WorkflowEditor
          key={editor.template.id}
          initial={editor.template}
          base={editor.base}
          isNew={editor.isNew}
          currentRevision={catalogue?.revision}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function WorkflowEditor({
  initial,
  base,
  isNew,
  currentRevision,
  onClose,
}: {
  initial: WorkflowTemplate;
  base: Catalogue;
  isNew: boolean;
  currentRevision?: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial),
    write = useSaveCatalogue();
  const stale =
    currentRevision !== undefined && currentRevision !== base.revision;
  function move(index: number, delta: number) {
    const steps = [...draft.steps],
      to = index + delta;
    if (to < 0 || to >= steps.length) return;
    [steps[index], steps[to]] = [steps[to], steps[index]];
    setDraft({ ...draft, steps });
  }
  return (
    <Dialog
      title={isNew ? "Add workflow" : `Edit ${initial.name}`}
      subtitle="Name the steps and arrange them in the order your team will follow."
      onClose={onClose}
      busy={write.busy}
      wide
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (stale) return;
          const parsed = workflowTemplateSchema.safeParse(draft);
          if (!parsed.success)
            return write.setError(parsed.error.issues[0].message);
          const settings = structuredClone(workflowsFor(base));
          settings.templates = isNew
            ? [...settings.templates, parsed.data]
            : settings.templates.map((t) =>
                t.id === draft.id ? parsed.data : t,
              );
          if (
            await write.save(
              { ...base, workflows: settings },
              `${parsed.data.name} saved.`,
            )
          )
            onClose();
        }}
      >
        <div className={`dialog-body ${styles.editor}`}>
          {stale && (
            <p className="form-error" role="alert">
              Settings changed while this editor was open. Close and reopen it
              before saving. Your draft is still shown here.
            </p>
          )}
          <fieldset disabled={write.busy} className={styles.fieldset}>
            <label className="field">
              Workflow name
              <input
                autoFocus
                required
                maxLength={80}
                value={draft.name}
                placeholder="e.g. Blouse with embroidery"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <div className={styles.heading}>
              <div>
                <h3>Work steps</h3>
                <p>Use the arrows to change the order.</p>
              </div>
              <span>{draft.steps.length} / 20</span>
            </div>
            <ol className={styles.steps}>
              {draft.steps.map((step, index) => (
                <li key={step.id} className={styles.step}>
                  <span className={styles.number}>{index + 1}</span>
                  <div className={styles.stepFields}>
                    <label className="field">
                      Step name
                      <input
                        aria-label={`Step ${index + 1} name`}
                        required
                        maxLength={80}
                        value={step.name}
                        placeholder="e.g. Embroidery or Quality check"
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            steps: draft.steps.map((s) =>
                              s.id === step.id
                                ? { ...s, name: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      Handled at
                      <select
                        aria-label={`Step ${index + 1} workstation`}
                        value={step.station}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            steps: draft.steps.map((s) =>
                              s.id === step.id
                                ? { ...s, station: Number(e.target.value) }
                                : s,
                            ),
                          })
                        }
                      >
                        {STATIONS.map((station, value) => (
                          <option value={value} key={station}>
                            {station}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className={styles.stepActions}>
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label={`Move step ${index + 1} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      disabled={index === draft.steps.length - 1}
                      aria-label={`Move step ${index + 1} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      type="button"
                      disabled={draft.steps.length === 1}
                      aria-label={`Remove step ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          steps: draft.steps.filter((s) => s.id !== step.id),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="button"
              disabled={draft.steps.length >= 20}
              onClick={() =>
                setDraft({
                  ...draft,
                  steps: [
                    ...draft.steps,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      station: draft.steps.at(-1)?.station ?? 0,
                    },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add step
            </button>
            <p className={styles.hint}>
              “Handled at” chooses the workstation responsible for a step.
              Several steps can be handled at the same workstation.
            </p>
          </fieldset>
          {write.error && (
            <p className="form-error" role="alert">
              {write.error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            disabled={write.busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={write.busy || stale}
          >
            {write.busy ? "Saving…" : "Save workflow"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
