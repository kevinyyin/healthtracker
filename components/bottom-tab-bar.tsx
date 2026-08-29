"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gear, Heartbeat, House, Moon, PersonSimpleRun } from "@phosphor-icons/react";

const TABS = [
  { href: "/today", label: "Home", icon: House },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/activity", label: "Activity", icon: PersonSimpleRun },
  { href: "/vitals", label: "Vitals", icon: Heartbeat },
  { href: "/settings", label: "Settings", icon: Gear },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/[.08] bg-background pb-[env(safe-area-inset-bottom)] md:hidden dark:border-white/[.145]">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
              active ? "text-foreground" : "text-foreground/50"
            }`}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
