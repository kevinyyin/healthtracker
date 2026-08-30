"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { saveDashboardWidgets } from "@/lib/actions/dashboard-widgets";
import { WIDGET_CATALOG, widgetLabel, type WidgetKey } from "@/lib/dashboard-widgets";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

export function CustomizeDrawer({ initialKeys }: { initialKeys: WidgetKey[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useDialogA11y(open, () => setOpen(false));
  const [keys, setKeys] = useState<WidgetKey[]>(initialKeys);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const available = WIDGET_CATALOG.filter((w) => !keys.includes(w.key));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= keys.length) return;
    const next = [...keys];
    [next[index], next[target]] = [next[target], next[index]];
    setKeys(next);
    setSaved(false);
  }

  function remove(key: WidgetKey) {
    setKeys((prev) => prev.filter((k) => k !== key));
    setSaved(false);
  }

  function add(key: WidgetKey) {
    setKeys((prev) => [...prev, key]);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveDashboardWidgets(keys);
      setSaved(true);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm">
        Customize
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customize-drawer-title"
            tabIndex={-1}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-surface p-6 shadow-2xl outline-none sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="customize-drawer-title" className="text-lg font-semibold">
                Customize Dashboard
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">
                <X size={16} weight="bold" />
              </button>
            </div>

            <h3 className="eyebrow mb-2">Your widgets</h3>
            {keys.length === 0 ? (
              <p className="mb-4 text-sm text-foreground/60">No widgets — add some below.</p>
            ) : (
              <ul className="mb-4 flex flex-col gap-1.5">
                {keys.map((key, i) => (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <span>{widgetLabel(key)}</span>
                    <div className="flex items-center gap-1 -mr-2">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="btn btn-ghost btn-icon !p-2"
                        aria-label="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === keys.length - 1}
                        className="btn btn-ghost btn-icon !p-2"
                        aria-label="Move down"
                      >
                        &darr;
                      </button>
                      <button type="button" onClick={() => remove(key)} className="btn btn-ghost btn-icon !p-2" aria-label={`Remove ${widgetLabel(key)}`}>
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {available.length > 0 && (
              <>
                <h3 className="eyebrow mb-2">Add a widget</h3>
                <ul className="mb-4 flex flex-wrap gap-2">
                  {available.map((w) => (
                    <li key={w.key}>
                      <button type="button" onClick={() => add(w.key)} className="chip">
                        + {w.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button type="button" onClick={handleSave} disabled={isPending} className="btn btn-primary w-full">
              {isPending ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
