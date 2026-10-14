import { ChevronRight, Plus, Send } from "lucide-react";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { LEAD_SOURCES, LEAD_STATUS_ORDER, LEAD_STATUSES, TONES } from "@/lib/constants";
import { ensureServices } from "@/lib/data";
import { formatShortDate, todayLocal } from "@/lib/dates";
import type { Lead, LeadStatus, Service } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

import { createLead } from "./actions";
import { CrmTabs } from "./crm-tabs";
import { LeadFields } from "./lead-fields";

export const metadata = { title: "CRM" };

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const filter = estado && estado in LEAD_STATUSES ? (estado as LeadStatus) : null;
  const { supabase } = await requireUser();
  const today = todayLocal();

  await ensureServices(supabase);
  const [{ data }, { data: servicesData }] = await Promise.all([
    supabase.from("leads").select("*").order("follow_up_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("services").select("name").eq("active", true),
  ]);
  const leads = (data ?? []) as Lead[];
  const services = ((servicesData ?? []) as Pick<Service, "name">[]).map((s) => s.name);
  const active = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const dueToday = active.filter((l) => l.follow_up_at && l.follow_up_at <= today);
  const list = filter ? leads.filter((l) => l.status === filter) : active.filter((l) => !dueToday.includes(l));
  const counts = Object.fromEntries(LEAD_STATUS_ORDER.map((s) => [s, leads.filter((l) => l.status === s).length]));

  return (
    <>
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">{active.length} activos</span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Leads</h1>
        </div>
      </header>

      <CrmTabs active="/crm" />

      <div className="grid grid-cols-5 gap-1.5 text-center">
        {LEAD_STATUS_ORDER.filter((s) => s !== "lost").map((s) => {
          const tone = TONES[LEAD_STATUSES[s].tone];
          const selected = filter === s;
          return (
            <Link
              key={s}
              href={selected ? "/crm" : `/crm?estado=${s}`}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex flex-col gap-0.5 rounded-[18px] py-2.5",
                selected ? "bg-accent text-white" : s === "proposal" || s === "won" ? cn(tone.bg, tone.text) : "bg-card",
              )}
            >
              <span className="text-lg font-extrabold">{counts[s]}</span>
              <span className={cn("text-[10px] font-bold", !selected && s !== "proposal" && s !== "won" && "text-muted")}>
                {LEAD_STATUSES[s].label}
              </span>
            </Link>
          );
        })}
      </div>

      {!filter && dueToday.length > 0 ? (
        <section aria-labelledby="hoy-toca" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
          <h2 id="hoy-toca" className="text-base font-extrabold">
            Hoy toca · {dueToday.length}
          </h2>
          {dueToday.map((l) => (
            <div key={l.id} className="flex items-center gap-3">
              <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-[16px] font-extrabold", TONES[LEAD_STATUSES[l.status].tone].bg, TONES[LEAD_STATUSES[l.status].tone].text)}>
                {initials(l.company ?? l.name)}
              </span>
              <Link href={`/crm/${l.id}`} className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-extrabold">{l.company ?? l.name}</span>
                <span className="truncate text-[13px] text-muted">
                  {LEAD_STATUSES[l.status].label}
                  {l.next_step ? ` · ${l.next_step}` : ""}
                  {l.follow_up_at && l.follow_up_at < today ? " · atrasado" : ""}
                </span>
              </Link>
              <Link
                href={`/crm/${l.id}#mensaje`}
                aria-label={`Redactar mensaje para ${l.company ?? l.name}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-accent text-white"
              >
                <Send className="size-[18px]" aria-hidden />
              </Link>
            </div>
          ))}
        </section>
      ) : null}

      {list.length > 0 ? (
        <section aria-label="Leads" className="flex flex-col rounded-[26px] bg-card px-[18px] py-2">
          {list.map((l, i) => (
            <Link key={l.id} href={`/crm/${l.id}`} className={cn("flex items-center justify-between gap-3 py-3", i > 0 && "border-t border-line")}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold">{l.company ?? l.name}</span>
                <span className="truncate text-xs text-muted">
                  {[l.city, l.service_interest, l.source ? LEAD_SOURCES[l.source] : null].filter(Boolean).join(" · ") || l.name}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {l.follow_up_at ? (
                  <span className="text-xs font-bold text-muted">{formatShortDate(l.follow_up_at)}</span>
                ) : (
                  <Badge tone={LEAD_STATUSES[l.status].tone}>{LEAD_STATUSES[l.status].label}</Badge>
                )}
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </span>
            </Link>
          ))}
        </section>
      ) : dueToday.length === 0 ? (
        <EmptyState title={filter ? `No hay leads en «${LEAD_STATUSES[filter].label}»` : "Aún no tienes leads"} text="Añade uno aquí o desde la captura rápida." />
      ) : null}

      <details className="group rounded-[26px] bg-card p-[18px]">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold">
          Nuevo lead
          <Plus className="size-5 transition-transform group-open:rotate-45" aria-hidden />
        </summary>
        <div className="pt-4">
          <ActionForm action={createLead} submitLabel="Crear lead">
            <LeadFields services={services} />
          </ActionForm>
        </div>
      </details>
    </>
  );
}
