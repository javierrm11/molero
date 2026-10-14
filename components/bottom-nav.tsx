"use client";

import { CalendarDays, Home, KanbanSquare, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/contenido", label: "Contenido", icon: KanbanSquare },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/asistente", label: "Asistente IA", icon: Sparkles },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),16px)] z-30 mx-auto flex h-16 max-w-[440px] items-center justify-between rounded-[32px] bg-card px-2.5 shadow-[0_8px_24px_rgba(20,32,27,0.08)]"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 w-12 items-center justify-center rounded-[22px] transition-colors",
              active ? "bg-accent text-white" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-[21px]" strokeWidth={1.9} aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}
