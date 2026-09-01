"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { saveHealthLogOverride } from "@/lib/actions/health-log-overrides";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

interface FieldState {
  hrv_rmssd: string;
  resting_hr: string;
  spo2: string;
  total_sleep_minutes: string;
  deep_sleep_minutes: string;
  rem_sleep_minutes: string;
  light_sleep_minutes: string;
  awake_minutes: string;
}

const EMPTY_FIELDS: FieldState = {
  hrv_rmssd: "",
  resting_hr: "",
  spo2: "",
  total_sleep_minutes: "",
  deep_sleep_minutes: "",
  rem_sleep_minutes: "",
  light_sleep_minutes: "",
  awake_minutes: "",
};

function toNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function CorrectionDrawer({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useDialogA11y(open, () => setOpen(false));
  const [date, setDate] = useState(today);
  const [fields, setFields] = useState<FieldState>(EMPTY_FIELDS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof FieldState, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await saveHealthLogOverride({
          date,
          hrv_rmssd: toNullableNumber(fields.hrv_rmssd),
          resting_hr: toNullableNumber(fields.resting_hr),
          spo2: toNullableNumber(fields.spo2),
          total_sleep_minutes: toNullableNumber(fields.total_sleep_minutes),
          deep_sleep_minutes: toNullableNumber(fields.deep_sleep_minutes),
          rem_sleep_minutes: toNullableNumber(fields.rem_sleep_minutes),
          light_sleep_minutes: toNullableNumber(fields.light_sleep_minutes),
          awake_minutes: toNullableNumber(fields.awake_minutes),
        });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline w-fit">
        Correct data
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
            aria-labelledby="correction-drawer-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-t-3xl border border-[var(--border)] bg-surface p-6 shadow-2xl outline-none sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="correction-drawer-title" className="text-lg font-semibold">
                Correct or Backfill Data
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">
                <X size={16} weight="bold" />
              </button>
            </div>

            <p className="mb-4 text-xs text-foreground/60">
              Leave a field blank to keep using the synced value. These overrides don&apos;t get overwritten by future
              syncs.
            </p>

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

            <div className="mb-4 flex flex-col gap-2">
              <p className="eyebrow">Sleep (minutes)</p>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Total" value={fields.total_sleep_minutes} onChange={(v) => setField("total_sleep_minutes", v)} />
                <NumberField label="Deep" value={fields.deep_sleep_minutes} onChange={(v) => setField("deep_sleep_minutes", v)} />
                <NumberField label="REM" value={fields.rem_sleep_minutes} onChange={(v) => setField("rem_sleep_minutes", v)} />
                <NumberField label="Light" value={fields.light_sleep_minutes} onChange={(v) => setField("light_sleep_minutes", v)} />
                <NumberField label="Awake" value={fields.awake_minutes} onChange={(v) => setField("awake_minutes", v)} />
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-2">
              <p className="eyebrow">Vitals</p>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="HRV (ms)" value={fields.hrv_rmssd} onChange={(v) => setField("hrv_rmssd", v)} />
                <NumberField label="Resting HR (bpm)" value={fields.resting_hr} onChange={(v) => setField("resting_hr", v)} />
                <NumberField label="SpO2 (%)" value={fields.spo2} onChange={(v) => setField("spo2", v)} />
              </div>
            </div>

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

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-foreground/70">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </label>
  );
}
