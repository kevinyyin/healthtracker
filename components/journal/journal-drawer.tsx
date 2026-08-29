"use client";

import { useState, useTransition } from "react";
import { saveJournalEntry } from "@/lib/actions/journal";
import type { HabitCorrelation } from "@/lib/analytics/habit-correlations";

const DEFAULT_HABITS = ["Caffeine", "Late Meal", "Alcohol", "Sauna"];

interface JournalDrawerProps {
  today: string;
  yesterday: string;
  habitsToday: string[];
  habitsYesterday: string[];
  correlations: HabitCorrelation[];
}

export function JournalDrawer({ today, yesterday, habitsToday, habitsYesterday, correlations }: JournalDrawerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [habits, setHabits] = useState<string[]>(habitsToday);
  const [customHabit, setCustomHabit] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function switchDate(newDate: string) {
    setDate(newDate);
    setHabits(newDate === today ? habitsToday : habitsYesterday);
    setSaved(false);
  }

  function toggleHabit(habit: string) {
    setHabits((prev) => (prev.includes(habit) ? prev.filter((h) => h !== habit) : [...prev, habit]));
    setSaved(false);
  }

  function addCustomHabit() {
    const habit = customHabit.trim();
    if (!habit || habits.includes(habit)) return;
    setHabits((prev) => [...prev, habit]);
    setCustomHabit("");
  }

  function handleSave() {
    startTransition(async () => {
      await saveJournalEntry({ date, habits, notes: notes || null });
      setSaved(true);
    });
  }

  const chipHabits = [...new Set([...DEFAULT_HABITS, ...habits])];
  const insights = correlations.filter((c) => c.confidence === "low");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
      >
        Log habits
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-lg border border-black/[.08] bg-background p-6 sm:rounded-lg dark:border-white/[.145]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Daily Habits</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-foreground/60" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="mb-4 flex gap-1">
              <DateToggle label="Yesterday" active={date === yesterday} onClick={() => switchDate(yesterday)} />
              <DateToggle label="Today" active={date === today} onClick={() => switchDate(today)} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {chipHabits.map((habit) => (
                <button
                  key={habit}
                  type="button"
                  onClick={() => toggleHabit(habit)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    habits.includes(habit)
                      ? "bg-foreground text-background"
                      : "border border-black/[.08] dark:border-white/[.145]"
                  }`}
                >
                  {habit}
                </button>
              ))}
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Add custom habit"
                value={customHabit}
                onChange={(e) => setCustomHabit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomHabit();
                  }
                }}
                className="flex-1 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
              />
              <button
                type="button"
                onClick={addCustomHabit}
                className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
              >
                Add
              </button>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mb-4 w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="w-full rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
            >
              {isPending ? "Saving..." : saved ? "Saved" : "Save"}
            </button>

            {insights.length > 0 && (
              <div className="mt-6 border-t border-black/[.08] pt-4 dark:border-white/[.145]">
                <h3 className="mb-2 text-sm font-medium">Insights</h3>
                <ul className="flex flex-col gap-1 text-sm text-foreground/70">
                  {insights.map((c, i) => (
                    <li key={i}>
                      {c.habit}: {c.outcome === "recovery" ? "Recovery" : "Deep sleep"} {c.effect >= 0 ? "+" : ""}
                      {c.outcome === "recovery" ? `${c.effect.toFixed(1)}%` : `${Math.round(c.effect)}min`} (n=
                      {c.nWith})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DateToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm ${
        active ? "bg-foreground text-background" : "border border-black/[.08] dark:border-white/[.145]"
      }`}
    >
      {label}
    </button>
  );
}
