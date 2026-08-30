"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { saveJournalEntry } from "@/lib/actions/journal";
import type { HabitCorrelation } from "@/lib/analytics/habit-correlations";
import { useDialogA11y } from "@/lib/use-dialog-a11y";

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
  const panelRef = useDialogA11y(open, () => setOpen(false));
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
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline w-fit">
        Log habits
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
            aria-labelledby="journal-drawer-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-t-3xl border border-[var(--border)] bg-surface p-6 shadow-2xl outline-none sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="journal-drawer-title" className="text-lg font-semibold">
                Daily Habits
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close">
                <X size={16} weight="bold" />
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
                  className={`chip ${habits.includes(habit) ? "chip-active" : ""}`}
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
                className="field flex-1"
              />
              <button type="button" onClick={addCustomHabit} className="btn btn-outline btn-sm">
                Add
              </button>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="field mb-4 w-full"
            />

            <button type="button" onClick={handleSave} disabled={isPending} className="btn btn-primary w-full">
              {isPending ? "Saving..." : saved ? "Saved" : "Save"}
            </button>

            {insights.length > 0 && (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <h3 className="eyebrow mb-2">Insights</h3>
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
    <button type="button" onClick={onClick} className={`chip ${active ? "chip-active" : ""}`}>
      {label}
    </button>
  );
}
