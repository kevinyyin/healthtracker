"use client";

import { useState, useTransition } from "react";
import { setActivityStatus } from "@/lib/actions/activity-status";

export function IllnessBanner({ reasons }: { reasons: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  const [marked, setMarked] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleMarkSick() {
    startTransition(async () => {
      await setActivityStatus("sick");
      setMarked(true);
    });
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm"
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-danger">Possible early illness signal</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-foreground/70">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="btn btn-ghost btn-icon shrink-0"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
      <button
        type="button"
        onClick={handleMarkSick}
        disabled={isPending || marked}
        className="btn btn-outline btn-sm w-fit"
      >
        {isPending ? "Marking..." : marked ? "Marked as Sick" : "Mark as Sick"}
      </button>
    </div>
  );
}
