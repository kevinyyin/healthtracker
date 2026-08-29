"use client";

import { useState, useTransition } from "react";
import { logStrengthSet } from "@/lib/actions/strength";

interface LoggedSet {
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
}

export function StrengthBuilderForm({ date }: { date: string }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [exerciseName, setExerciseName] = useState("");
  const [reps, setReps] = useState(8);
  const [weightKg, setWeightKg] = useState(20);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function nextSetNumber(name: string): number {
    return loggedSets.filter((s) => s.exerciseName === name).length + 1;
  }

  function handleLogSet() {
    const name = exerciseName.trim();
    if (!name) {
      setError("Enter an exercise name first.");
      return;
    }
    setError(null);

    const setNumber = nextSetNumber(name);
    const set = { exerciseName: name, setNumber, reps, weightKg };

    startTransition(async () => {
      try {
        await logStrengthSet({ sessionId, date, exerciseName: name, setNumber, reps, weightKg });
        setLoggedSets((prev) => [...prev, set]);
      } catch {
        setError("Failed to save set — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-black/[.08] p-4 dark:border-white/[.145]">
      <h2 className="font-medium">Log a set</h2>

      <input
        type="text"
        placeholder="Exercise (e.g. Squat)"
        value={exerciseName}
        onChange={(e) => setExerciseName(e.target.value)}
        className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
      />

      <div className="flex gap-6">
        <Counter label="Reps" value={reps} onChange={setReps} step={1} min={1} />
        <Counter label="Weight (kg)" value={weightKg} onChange={setWeightKg} step={2.5} min={0} />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleLogSet}
        disabled={isPending}
        className="w-fit rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Add set"}
      </button>

      {loggedSets.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-black/[.08] pt-3 text-sm dark:border-white/[.145]">
          {loggedSets.map((set, i) => (
            <li key={i} className="flex justify-between text-foreground/70">
              <span>
                {set.exerciseName} — set {set.setNumber}
              </span>
              <span className="tabular-nums">
                {set.reps} × {set.weightKg}kg
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  onChange,
  step,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-foreground/60">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="h-8 w-8 rounded border border-black/[.08] text-lg dark:border-white/[.145]"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-10 text-center tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="h-8 w-8 rounded border border-black/[.08] text-lg dark:border-white/[.145]"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
