import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { BlockRow } from "@/components/block-row";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getBlocksForDay, getTemplates } from "@/lib/data";
import {
  addDays,
  dayNumber,
  formatDuration,
  formatLongDate,
  formatTime,
  isValidDate,
  isoWeek,
  minutesBetween,
  nowMs,
  todayLocal,
  weekDays,
  weekdayLetter,
} from "@/lib/dates";
import type { BlockTemplate, Content, Lead, TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

import { applyTemplate, createBlock } from "./actions";
import { BlockForm } from "./block-form";

export const metadata = { title: "Agenda" };

function TemplateButtons({ templates, date }: { templates: BlockTemplate[]; date: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {templates.map((t) => (
        <form key={t.id} action={applyTemplate.bind(null, t.id, date)}>
          <Button type="submit" variant="white" size="sm">
            {t.name}
          </Button>
        </form>
      ))}
    </div>
  );
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const today = todayLocal();
  const date = isValidDate(d) ? d : today;
  const { supabase } = await requireUser();
  const now = nowMs();

  const [blocksRaw, templates, contentsRes, leadsRes] = await Promise.all([
    getBlocksForDay(supabase, date),
    getTemplates(supabase),
    supabase.from("contents").select("id, title").neq("status", "published").order("planned_at", { nullsFirst: false }).limit(40),
    supabase
      .from("leads")
      .select("id, name, company")
      .not("status", "in", "(won,lost)")
      .order("follow_up_at", { nullsFirst: false })
      .limit(40),
  ]);
  const blocks = blocksRaw as TimeBlock[];
  const contents = (contentsRes.data ?? []) as Pick<Content, "id" | "title">[];
  const leads = ((leadsRes.data ?? []) as Pick<Lead, "id" | "name" | "company">[]).map((l) => ({
    id: l.id,
    label: l.company ? `${l.company} (${l.name})` : l.name,
  }));

  const days = weekDays(date);
  const planned = blocks.filter((b) => b.type !== "rest").reduce((sum, b) => sum + minutesBetween(b.start_at, b.end_at), 0);
  const done = blocks.filter((b) => b.status === "done").length;
  const lastEnd = blocks.at(-1)?.end_at;
  const nextStart = lastEnd ? formatTime(lastEnd) : "16:00";
  const nextEnd = lastEnd ? formatTime(new Date(new Date(lastEnd).getTime() + 60 * 60000).toISOString()) : "17:00";

  return (
    <>
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted first-letter:uppercase">
            {formatLongDate(date)} · semana {isoWeek(date)}
          </span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Agenda</h1>
        </div>
        {date !== today ? (
          <Link href="/agenda" className="flex h-10 items-center rounded-[14px] bg-card px-3.5 text-[13px] font-bold">
            Hoy
          </Link>
        ) : null}
      </header>

      <div className="flex items-center gap-1">
        <Link
          href={`/agenda?d=${addDays(date, -7)}`}
          aria-label="Semana anterior"
          className="flex h-[54px] w-7 shrink-0 items-center justify-center text-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <div className="grid flex-1 grid-cols-7 gap-1 rounded-[22px] bg-card p-1.5 text-center">
          {days.map((day) => (
            <Link
              key={day}
              href={`/agenda?d=${day}`}
              aria-current={day === date ? "date" : undefined}
              className={cn(
                "flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-[16px]",
                day === date ? "bg-accent text-accent-soft" : "text-muted",
              )}
            >
              <span className="text-[11px] font-bold">{weekdayLetter(day)}</span>
              <span
                className={cn("text-[15px] font-extrabold", day === date ? "text-white" : day === today ? "text-accent" : "text-ink")}
              >
                {dayNumber(day)}
              </span>
            </Link>
          ))}
        </div>
        <Link
          href={`/agenda?d=${addDays(date, 7)}`}
          aria-label="Semana siguiente"
          className="flex h-[54px] w-7 shrink-0 items-center justify-center text-muted"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      {blocks.length > 0 ? (
        <>
          <p className="px-1 text-[13px] font-semibold text-muted">
            {done} de {blocks.length} bloques hechos · {formatDuration(planned)} planificadas
          </p>
          <ol aria-label="Bloques del día" className="flex flex-col gap-2">
            {blocks.map((b) => (
              <BlockRow key={b.id} block={b} now={now} />
            ))}
          </ol>
        </>
      ) : (
        <EmptyState title="Día sin planificar" text="Usa una plantilla, pide a la IA que te lo organice o añade bloques a mano.">
          <div className="mt-2">
            <TemplateButtons templates={templates} date={date} />
          </div>
        </EmptyState>
      )}

      <Link
        href={`/asistente?plan=${date}`}
        className="flex h-[52px] items-center justify-center gap-2 rounded-[20px] bg-accent-tint text-sm font-extrabold text-accent-dark"
      >
        <Sparkles className="size-[18px]" aria-hidden />
        Organizar este día con IA
      </Link>

      <details className="group rounded-[26px] bg-card p-[18px]">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold">
          Añadir bloque
          <Plus className="size-5 transition-transform group-open:rotate-45" aria-hidden />
        </summary>
        <div className="pt-4">
          <BlockForm
            action={createBlock}
            contents={contents}
            leads={leads}
            submitLabel="Añadir a la agenda"
            defaults={{ date, start: nextStart, end: nextEnd, type: "record", title: "" }}
          />
        </div>
      </details>

      {blocks.length > 0 && templates.length > 0 ? (
        <section aria-labelledby="plantillas" className="flex flex-col gap-2 px-1">
          <h2 id="plantillas" className="text-[13px] font-bold text-muted">
            Añadir una plantilla a este día
          </h2>
          <TemplateButtons templates={templates} date={date} />
        </section>
      ) : null}
    </>
  );
}
