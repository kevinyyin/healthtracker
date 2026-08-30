"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Airplane, Bandaids, CaretDown, Lightning, Thermometer, type Icon } from "@phosphor-icons/react";
import { setActivityStatus } from "@/lib/actions/activity-status";
import { statusLabel, type ActivityStatus } from "@/lib/activity-status";

const OPTIONS: { key: ActivityStatus; icon: Icon }[] = [
  { key: "active", icon: Lightning },
  { key: "sick", icon: Thermometer },
  { key: "injured", icon: Bandaids },
  { key: "traveling", icon: Airplane },
];

export function StatusToggle({ currentStatus }: { currentStatus: ActivityStatus }) {
  const [status, setStatus] = useState(currentStatus);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function choose(next: ActivityStatus) {
    setStatus(next);
    setOpen(false);
    startTransition(async () => {
      await setActivityStatus(next);
    });
  }

  const CurrentIcon = OPTIONS.find((o) => o.key === status)?.icon ?? Lightning;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`btn btn-sm flex items-center gap-1 !px-2.5 ${
          status === "active" ? "btn-ghost" : "bg-foreground/10 text-foreground"
        }`}
        aria-label="Set activity status"
      >
        <CurrentIcon size={16} weight="bold" />
        <span className="hidden sm:inline">{statusLabel(status)}</span>
        <CaretDown size={10} weight="bold" />
      </button>

      {open && (
        <div className="card absolute left-0 top-full z-50 mt-2 flex w-36 flex-col gap-0.5 p-1 md:left-auto md:right-0">
          {OPTIONS.map(({ key, icon: OptionIcon }) => (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors duration-150 ${
                status === key ? "bg-foreground text-background" : "hover:bg-foreground/[.06]"
              }`}
            >
              <OptionIcon size={16} weight="bold" />
              {statusLabel(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
