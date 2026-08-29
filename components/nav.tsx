"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/sleep", label: "Sleep" },
  { href: "/activity", label: "Activity" },
  { href: "/vitals", label: "Vitals" },
  { href: "/trends", label: "Trends" },
  { href: "/biological-age", label: "Bio Age" },
  { href: "/settings", label: "Settings" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b border-black/[.08] px-4 pb-3 dark:border-white/[.145] [padding-top:calc(0.75rem+env(safe-area-inset-top))]">
      <div className="hidden gap-1 md:flex">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <ThemeToggle />
    </nav>
  );
}
