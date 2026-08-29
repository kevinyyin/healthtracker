"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { saveDashboardWidgets } from "@/lib/actions/dashboard-widgets";
import { WIDGET_CATALOG, widgetLabel, type WidgetKey } from "@/lib/dashboard-widgets";

export function CustomizeDrawer({ initialKeys }: { initialKeys: WidgetKey[] }) {
  const [open, setOpen] = useState(false);
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-black/[.08] px-3 py-1.5 text-sm transition-[background-color,transform] active:scale-[0.98] dark:border-white/[.145]"
      >
        Customize
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-lg border border-black/[.08] bg-background p-6 sm:rounded-lg dark:border-white/[.145]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Customize Dashboard</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-foreground/60 transition-colors hover:bg-black/[.04] active:scale-[0.98] dark:hover:bg-white/[.08]"
                aria-label="Close"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <h3 className="mb-2 text-sm font-medium text-foreground/70">Your widgets</h3>
            {keys.length === 0 ? (
              <p className="mb-4 text-sm text-foreground/60">No widgets — add some below.</p>
            ) : (
              <ul className="mb-4 flex flex-col gap-1">
                {keys.map((key, i) => (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
                  >
                    <span>{widgetLabel(key)}</span>
                    <div className="flex items-center gap-1 -mr-2">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded p-2.5 text-foreground/60 transition-colors hover:bg-black/[.04] disabled:opacity-30 dark:hover:bg-white/[.08]"
                        aria-label="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === keys.length - 1}
                        className="rounded p-2.5 text-foreground/60 transition-colors hover:bg-black/[.04] disabled:opacity-30 dark:hover:bg-white/[.08]"
                        aria-label="Move down"
                      >
                        &darr;
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(key)}
                        className="rounded p-2.5 text-foreground/60 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
                        aria-label={`Remove ${widgetLabel(key)}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {available.length > 0 && (
              <>
                <h3 className="mb-2 text-sm font-medium text-foreground/70">Add a widget</h3>
                <ul className="mb-4 flex flex-wrap gap-2">
                  {available.map((w) => (
                    <li key={w.key}>
                      <button
                        type="button"
                        onClick={() => add(w.key)}
                        className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm transition-[background-color,transform] active:scale-[0.98] dark:border-white/[.145]"
                      >
                        + {w.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="w-full rounded bg-foreground px-4 py-2 text-sm text-background transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
