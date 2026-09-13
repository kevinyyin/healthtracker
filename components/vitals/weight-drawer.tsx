"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { saveWeightEntry } from "@/lib/actions/body-metrics";
import { useDialogA11y } from "@/lib/use-dialog-a11y";
import { toKg, type UnitSystem } from "@/lib/units-format";

export function WeightDrawer({ today, unitSystem }: { today: string; unitSystem: UnitSystem }) {
  const [open, setOpen] = useState(false);
  const panelRef = useDialogA11y(open, () => setOpen(false));
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unitLabel = unitSystem === "imperial" ? "lb" : "kg";

  function handleSave() {
    const parsed = Number(value.trim());
    if (!Number.isFinite(parsed)) {
      setError("Enter a weight.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveWeightEntry({ date, kg: toKg(parsed, unitSystem) });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline w-fit">
        Log weight
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
            aria-labelledby="weight-drawer-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-t-3xl border border-[var(--border)] bg-surface p-6 shadow-2xl outline-none sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="weight-drawer-title" className="text-lg font-semibold">
                Log Weight
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">
                <X size={16} weight="bold" />
              </button>
            </div>

            <label className="mb-4 flex flex-col gap-1 text-sm">
              Date
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSaved(false);
                }}
                className="field"
              />
            </label>

            <label className="mb-4 flex flex-col gap-1 text-sm">
              Weight ({unitLabel})
              <input
                type="number"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSaved(false);
                }}
                className="field"
              />
            </label>
            <p className="mb-4 -mt-2 text-xs text-foreground/50">
              Logging again for the same date replaces that day&apos;s entry.
            </p>

            {error && <p className="mb-2 text-sm text-danger">{error}</p>}

            <button type="button" onClick={handleSave} disabled={isPending} className="btn btn-primary w-full">
              {isPending ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
