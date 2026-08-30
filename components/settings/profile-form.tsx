"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions/profile";

interface ProfileFormProps {
  initialDateOfBirth: string | null;
  initialBiologicalSex: "male" | "female" | null;
}

export function ProfileForm({ initialDateOfBirth, initialBiologicalSex }: ProfileFormProps) {
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth ?? "");
  const [biologicalSex, setBiologicalSex] = useState<"male" | "female" | null>(initialBiologicalSex);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!dateOfBirth || !biologicalSex) return;
    setError(null);
    startTransition(async () => {
      try {
        await saveProfile({ dateOfBirth, biologicalSex });
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
          <SexToggle
            label="Female"
            active={biologicalSex === "female"}
            onClick={() => {
              setBiologicalSex("female");
              setSaved(false);
            }}
          />
          <SexToggle
            label="Male"
            active={biologicalSex === "male"}
            onClick={() => {
              setBiologicalSex("male");
              setSaved(false);
            }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !dateOfBirth || !biologicalSex}
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

function SexToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${active ? "chip-active" : ""}`}>
      {label}
    </button>
  );
}
