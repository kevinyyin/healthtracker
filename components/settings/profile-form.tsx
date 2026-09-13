"use client";

import { useMemo, useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions/profile";
import type { UnitSystem } from "@/lib/units";

interface ProfileFormProps {
  initialDateOfBirth: string | null;
  initialBiologicalSex: "male" | "female" | null;
  initialTimezone: string | null;
  initialUnitSystem: UnitSystem;
  initialMaxHr: number | null;
}

/** Falls back gracefully on older runtimes/browsers without Intl.supportedValuesOf. */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

function listTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [detectTimezone()];
  }
}

export function ProfileForm({
  initialDateOfBirth,
  initialBiologicalSex,
  initialTimezone,
  initialUnitSystem,
  initialMaxHr,
}: ProfileFormProps) {
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth ?? "");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | null>(initialBiologicalSex);
  const [timezone, setTimezone] = useState(initialTimezone ?? detectTimezone());
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialUnitSystem);
  const [maxHrInput, setMaxHrInput] = useState(initialMaxHr != null ? String(initialMaxHr) : "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const timezones = useMemo(() => listTimezones(), []);

  function handleSave() {
    if (!dateOfBirth || !biologicalSex || !timezone) return;
    const maxHr = maxHrInput.trim() === "" ? null : Number(maxHrInput);
    setError(null);
    startTransition(async () => {
      try {
        await saveProfile({ dateOfBirth, biologicalSex, timezone, unitSystem, maxHr });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Date of birth
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => {
            setDateOfBirth(e.target.value);
            setSaved(false);
          }}
          className="field"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Biological sex
        <div className="flex gap-1">
          <ChipToggle
            label="Female"
            active={biologicalSex === "female"}
            onClick={() => {
              setBiologicalSex("female");
              setSaved(false);
            }}
          />
          <ChipToggle
            label="Male"
            active={biologicalSex === "male"}
            onClick={() => {
              setBiologicalSex("male");
              setSaved(false);
            }}
          />
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Timezone
        <select
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            setSaved(false);
          }}
          className="field"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-foreground/50">
        Used to compute your &quot;day&quot; and &quot;night&quot; boundaries for sleep and recovery. Update this
        when you travel.
      </p>

      <div className="flex flex-col gap-1 text-sm">
        Units
        <div className="flex gap-1">
          <ChipToggle
            label="Metric"
            active={unitSystem === "metric"}
            onClick={() => {
              setUnitSystem("metric");
              setSaved(false);
            }}
          />
          <ChipToggle
            label="Imperial"
            active={unitSystem === "imperial"}
            onClick={() => {
              setUnitSystem("imperial");
              setSaved(false);
            }}
          />
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Max heart rate (optional)
        <input
          type="number"
          inputMode="numeric"
          min={100}
          max={230}
          value={maxHrInput}
          onChange={(e) => {
            setMaxHrInput(e.target.value);
            setSaved(false);
          }}
          placeholder="220 minus your age"
          className="field"
        />
      </label>
      <p className="text-xs text-foreground/50 -mt-2">
        Used for Strain and Energy Bank&apos;s heart-rate zones. Defaults to 220 minus your age if left blank.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !dateOfBirth || !biologicalSex || !timezone}
        className="btn btn-primary w-fit"
      >
        {isPending ? "Saving..." : saved ? "Saved" : "Save"}
      </button>

      <p className="text-xs text-foreground/50">
        Used to estimate your{" "}
        <a href="/biological-age" className="underline">
          Biological Age
        </a>{" "}
        against published age norms. Not shared or used anywhere else.
      </p>
    </div>
  );
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${active ? "chip-active" : ""}`}>
      {label}
    </button>
  );
}
