"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusToggle } from "@/components/status-toggle";
import type { ActivityStatus } from "@/lib/activity-status";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/sleep", label: "Sleep" },
  { href: "/activity", label: "Activity" },
  { href: "/vitals", label: "Vitals" },
  { href: "/trends", label: "Trends" },
  { href: "/biological-age", label: "Bio Age" },
  { href: "/settings", label: "Settings" },
] as const;

export function Nav({ currentStatus }: { currentStatus: ActivityStatus }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b border-[var(--border)] bg-background px-4 pb-3 [padding-top:calc(0.75rem+env(safe-area-inset-top))]">
      <div className="hidden gap-1 md:flex">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-foreground/[.06]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        <StatusToggle currentStatus={currentStatus} />
        <ThemeToggle />
      </div>
    </nav>
  );
}
