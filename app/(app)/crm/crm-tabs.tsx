import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/crm", label: "Leads" },
  { href: "/crm/clientes", label: "Clientes" },
  { href: "/crm/servicios", label: "Servicios" },
];

export function CrmTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Secciones del CRM" className="grid grid-cols-3 rounded-[16px] bg-card p-1 text-sm font-bold">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn("flex h-10 items-center justify-center rounded-[12px]", tab.href === active ? "bg-accent text-white" : "text-muted")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
