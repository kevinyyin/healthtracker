"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/sleep", label: "Sleep" },
  { href: "/activity", label: "Activity" },
  { href: "/vitals", label: "Vitals" },
  { href: "/settings", label: "Settings" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-black/[.08] px-4 py-3 dark:border-white/[.145]">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-foreground text-background"
                : "text-foreground/70 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
