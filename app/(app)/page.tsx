import { Brain, ChevronRight, ClipboardCheck, Focus, Inbox, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";

import { isCurrent } from "@/components/block-row";
import { ProgressRing } from "@/components/progress-ring";
import { Dot } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { BLOCK_TYPES, FORMATS, LEAD_STATUSES } from "@/lib/constants";
import { ensureBrandContext, getBlocksForDay, getWeekGoals, inboxCount } from "@/lib/data";
import { formatDuration, formatLongDate, formatTime, greeting, nowMs, todayLocal } from "@/lib/dates";
import type { Content, Lead, TimeBlock } from "@/lib/types";

export default async function HomePage() {
  const { supabase } = await requireUser();
  const today = todayLocal();
  const now = nowMs();

  const [, blocksRaw, goals, inbox, leadsRes, contentsRes] = await Promise.all([
    ensureBrandContext(supabase),
    getBlocksForDay(supabase, today),
    getWeekGoals(supabase, today),
    inboxCount(supabase),
    supabase
      .from("leads")
      .select("id, name, company, status, next_step, follow_up_at")
      .lte("follow_up_at", today)
      .not("status", "in", "(won,lost)")
      .order("follow_up_at")
      .limit(5),
    supabase
      .from("contents")
      .select("id, title, format, status")
      .eq("planned_at", today)
      .neq("status", "published")
      .limit(5),
  ]);

  const blocks = blocksRaw as TimeBlock[];
  const leads = (leadsRes.data ?? []) as Lead[];
  const contents = (contentsRes.data ?? []) as Content[];
  const current = blocks.find((b) => isCurrent(b, now));
  const upcoming = blocks.filter((b) => b.status === "planned" && new Date(b.start_at).getTime() > now).slice(0, 3);
  const done = blocks.filter((b) => b.status === "done").length;

  return (
    <>
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted first-letter:uppercase">{formatLongDate(today)}</span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">{greeting()}, Javier</h1>
        </div>
        <Link
          href="/bandeja"
          aria-label={`Bandeja: ${inbox} capturas sin procesar`}
          className="relative flex size-11 items-center justify-center rounded-[16px] bg-card"
        >
          <Inbox className="size-5" aria-hidden />
          {inbox > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-white">
              {inbox}
            </span>
          ) : null}
        </Link>
      </header>

      {current ? (
        <section aria-labelledby="ahora" className="flex flex-col gap-3.5 rounded-[28px] bg-accent p-5 text-white">
          <div className="flex items-center justify-between text-xs font-bold tracking-wide">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-mint" />
              AHORA · {formatTime(current.start_at)} – {formatTime(current.end_at)}
            </span>
            <span className="text-[13px] text-accent-soft">
              quedan {formatDuration(Math.max(0, Math.round((new Date(current.end_at).getTime() - now) / 60000)))}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 id="ahora" className="text-[28px] font-extrabold tracking-[-0.6px]">
              {BLOCK_TYPES[current.type].label}
            </h2>
            <span className="text-[15px] text-[#e1f5ec]">{current.title}</span>
          </div>
          <div aria-hidden className="h-1.5 rounded-full bg-white/20">
            <div
              className="h-1.5 rounded-full bg-white"
              style={{
                width: `${Math.min(
                  100,
                  ((now - new Date(current.start_at).getTime()) /
                    (new Date(current.end_at).getTime() - new Date(current.start_at).getTime())) *
                    100,
                )}%`,
              }}
            />
          </div>
          <Link
            href={`/foco/${current.id}`}
            className="flex h-[52px] items-center justify-center gap-2 rounded-[18px] bg-card text-[15px] font-extrabold text-accent-dark"
          >
            <Focus className="size-[18px]" aria-hidden />
            Entrar en modo foco
          </Link>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-[28px] bg-accent p-5 text-white">
          <span className="text-xs font-bold tracking-wide text-accent-soft">AHORA</span>
          <h2 className="text-[22px] font-extrabold leading-tight">
            {blocks.length === 0 ? "Aún no has planificado hoy" : upcoming.length > 0 ? "Hueco libre" : "Día terminado"}
          </h2>
          <p className="text-sm text-[#e1f5ec]">
            {blocks.length === 0
              ? "Organiza el día en bloques y entra en foco cuando toque."
              : upcoming[0]
                ? `Siguiente: ${BLOCK_TYPES[upcoming[0].type].label} a las ${formatTime(upcoming[0].start_at)}.`
                : `Has completado ${done} de ${blocks.length} bloques.`}
          </p>
          {blocks.length === 0 ? (
            <div className="flex gap-2">
              <Link href="/agenda" className="flex h-12 flex-1 items-center justify-center rounded-[16px] bg-card text-sm font-extrabold text-accent-dark">
                Abrir agenda
              </Link>
              <Link
                href={`/asistente?plan=${today}`}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[16px] bg-white/15 text-sm font-extrabold"
              >
                <Sparkles className="size-4" aria-hidden />
                Organízame
              </Link>
            </div>
          ) : null}
        </section>
      )}

      {upcoming.length > 0 ? (
        <section aria-labelledby="despues" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
          <div className="flex items-center justify-between">
            <h2 id="despues" className="text-base font-extrabold">
              Después
            </h2>
            <Link href="/agenda" className="text-[13px] font-bold text-accent">
              Ver agenda
            </Link>
          </div>
          {upcoming.map((b) => (
            <Link key={b.id} href={`/foco/${b.id}`} className="flex items-center gap-3">
              <span className="w-12 text-[13px] font-bold text-muted">{formatTime(b.start_at)}</span>
              <Dot tone={BLOCK_TYPES[b.type].tone} />
              <span className="flex-1 truncate text-[15px] font-semibold">
                {BLOCK_TYPES[b.type].label} · {b.title}
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {leads.length > 0 || contents.length > 0 ? (
        <section aria-labelledby="hoy-toca" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
          <h2 id="hoy-toca" className="text-base font-extrabold">
            Hoy toca
          </h2>
          {contents.map((c) => (
            <Link key={c.id} href={`/contenido/${c.id}`} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-accent-tint text-xs font-extrabold text-accent-dark">
                PUB
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold">{c.title}</span>
                <span className="text-[13px] text-muted">{c.format ? FORMATS[c.format] : "Contenido"} · publicar hoy</span>
              </span>
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </Link>
          ))}
          {leads.map((l) => (
            <Link key={l.id} href={`/crm/${l.id}`} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-peach-tint text-xs font-extrabold text-peach-ink">
                SEG
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold">{l.company ?? l.name}</span>
                <span className="truncate text-[13px] text-muted">
                  {LEAD_STATUSES[l.status].label}
                  {l.next_step ? ` · ${l.next_step}` : ""}
                  {l.follow_up_at && l.follow_up_at < today ? " · atrasado" : ""}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </Link>
          ))}
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex items-center gap-3 rounded-[26px] bg-card p-4">
          <ProgressRing value={goals.contents.actual} max={goals.contents.target} />
          <span className="text-sm font-bold leading-tight">Contenidos</span>
        </div>
        <div className="flex items-center gap-3 rounded-[26px] bg-card p-4">
          <ProgressRing value={goals.contacts.actual} max={goals.contacts.target} color="#C2531F" track="#FDE7D7" />
          <span className="text-sm font-bold leading-tight">Contactos</span>
        </div>
      </div>

      <nav aria-label="Más" className="grid grid-cols-3 gap-2.5">
        {[
          { href: "/revision", label: "Revisión", icon: ClipboardCheck },
          { href: "/cerebro", label: "Cerebro", icon: Brain },
          { href: "/ajustes", label: "Ajustes", icon: Settings2 },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-[22px] bg-card py-3.5 text-[13px] font-bold">
            <Icon className="size-5 text-accent" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
