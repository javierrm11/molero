import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge, Dot } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { CONTENT_STATUS_ORDER, CONTENT_STATUSES, FORMATS, PILLARS, PLATFORMS } from "@/lib/constants";
import { addDays, formatShortDate, todayLocal, weekStart, isoWeek } from "@/lib/dates";
import type { Content, ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import { createContent } from "./actions";
import { ContentForm } from "./content-form";
import { TopicSuggestions } from "./topic-suggestions";

export const metadata = { title: "Contenido" };

function isStatus(value: string | undefined): value is ContentStatus {
  return !!value && (CONTENT_STATUS_ORDER as string[]).includes(value);
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vista?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const today = todayLocal();
  const calendar = params.vista === "calendario";

  const { data } = await supabase
    .from("contents")
    .select("id, title, pillar, format, platforms, status, hook, cta, planned_at, published_at")
    .order("planned_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const all = (data ?? []) as Content[];

  const counts = Object.fromEntries(CONTENT_STATUS_ORDER.map((s) => [s, all.filter((c) => c.status === s).length])) as Record<
    ContentStatus,
    number
  >;
  const status: ContentStatus = isStatus(params.estado) ? params.estado : counts.script > 0 ? "script" : "idea";
  const list = all.filter((c) => c.status === status);
  const publishedThisMonth = all.filter((c) => c.published_at?.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <>
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">
            Semana {isoWeek(today)} · {publishedThisMonth} publicados este mes
          </span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Contenido</h1>
        </div>
        <div role="tablist" aria-label="Vista" className="flex rounded-[14px] bg-card p-1 text-[13px] font-bold">
          <Link
            role="tab"
            aria-selected={!calendar}
            href="/contenido"
            className={cn("flex h-9 items-center rounded-[10px] px-3", !calendar ? "bg-accent text-white" : "text-muted")}
          >
            Tablero
          </Link>
          <Link
            role="tab"
            aria-selected={calendar}
            href="/contenido?vista=calendario"
            className={cn("flex h-9 items-center rounded-[10px] px-3", calendar ? "bg-accent text-white" : "text-muted")}
          >
            Mes
          </Link>
        </div>
      </header>

      {calendar ? (
        <MonthCalendar contents={all} month={params.mes && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : today.slice(0, 7)} today={today} />
      ) : (
        <>
          <div role="tablist" aria-label="Estado" className="scrollbar-none -mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] text-[13px] font-bold">
            {CONTENT_STATUS_ORDER.map((s) => (
              <Link
                key={s}
                role="tab"
                aria-selected={s === status}
                href={`/contenido?estado=${s}`}
                className={cn(
                  "flex h-10 shrink-0 items-center rounded-[20px] px-3.5",
                  s === status ? "bg-accent text-white" : "bg-card text-muted",
                )}
              >
                {CONTENT_STATUSES[s]} · {counts[s]}
              </Link>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState title={`Nada en «${CONTENT_STATUSES[status]}»`} text="Añade una idea o pide sugerencias a la IA." />
          ) : (
            list.map((c) => (
              <Link key={c.id} href={`/contenido/${c.id}`} className="flex flex-col gap-2.5 rounded-[26px] bg-card p-[18px]">
                <div className="flex items-center justify-between gap-2">
                  {c.pillar ? <Badge tone={PILLARS[c.pillar].tone}>{PILLARS[c.pillar].label}</Badge> : <Badge>Sin pilar</Badge>}
                  <span className={cn("text-xs font-bold", c.planned_at === today ? "text-accent" : "text-muted")}>
                    {c.status === "published"
                      ? c.published_at
                        ? formatShortDate(c.published_at)
                        : ""
                      : c.planned_at
                        ? c.planned_at === today
                          ? "Hoy"
                          : formatShortDate(c.planned_at)
                        : "Sin fecha"}
                  </span>
                </div>
                <span className="text-lg leading-tight font-extrabold">{c.title}</span>
                <div className="flex items-center justify-between text-[13px] text-muted">
                  <span>
                    {c.format ? FORMATS[c.format] : "Sin formato"}
                    {c.platforms.length > 0 ? ` · ${c.platforms.map((p) => PLATFORMS[p]).join(", ")}` : ""}
                  </span>
                  <span>
                    Hook {c.hook ? "✓" : "—"} · CTA {c.cta ? "✓" : "—"}
                  </span>
                </div>
              </Link>
            ))
          )}

          <details className="group rounded-[26px] bg-card p-[18px]">
            <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold">
              Nueva idea
              <Plus className="size-5 transition-transform group-open:rotate-45" aria-hidden />
            </summary>
            <div className="pt-4">
              <ContentForm action={createContent} submitLabel="Crear idea" />
            </div>
          </details>

          <TopicSuggestions />
        </>
      )}
    </>
  );
}

function MonthCalendar({ contents, month, today }: { contents: Content[]; month: string; today: string }) {
  const first = `${month}-01`;
  const gridStart = weekStart(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y ?? 2026, m ?? 1, 1)).toISOString().slice(0, 7);
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T12:00:00Z`));

  const byDay = new Map<string, Content[]>();
  for (const c of contents) {
    const day = c.status === "published" ? c.published_at : c.planned_at;
    if (day) byDay.set(day, [...(byDay.get(day) ?? []), c]);
  }
  const monthItems = days.filter((d) => d.startsWith(month)).flatMap((d) => (byDay.get(d) ?? []).map((c) => ({ day: d, c })));

  return (
    <>
      <section aria-label="Calendario" className="flex flex-col gap-2.5 rounded-[26px] bg-card p-4">
        <div className="flex items-center justify-between">
          <Link href={`/contenido?vista=calendario&mes=${prev}`} aria-label="Mes anterior" className="flex size-10 items-center justify-center rounded-full bg-bg">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <h2 className="text-base font-extrabold first-letter:uppercase">{label}</h2>
          <Link href={`/contenido?vista=calendario&mes=${next}`} aria-label="Mes siguiente" className="flex size-10 items-center justify-center rounded-full bg-bg">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold text-muted">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-sm font-bold">
          {days.map((day) => {
            const items = byDay.get(day) ?? [];
            const inMonth = day.startsWith(month);
            return (
              <span
                key={day}
                className={cn(
                  "mx-0.5 flex h-11 flex-col items-center justify-center gap-1 rounded-[12px]",
                  !inMonth && "text-muted/50",
                  day === today && "bg-accent text-white",
                )}
              >
                {Number(day.slice(8))}
                <span className="flex h-1.5 gap-0.5">
                  {items.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        day === today ? "bg-white" : c.status === "published" ? "bg-accent" : "border border-accent",
                      )}
                    />
                  ))}
                </span>
              </span>
            );
          })}
        </div>
        <p className="flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Publicado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-accent" /> Previsto
          </span>
        </p>
      </section>

      {monthItems.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-[26px] bg-card p-[18px]">
          {monthItems.map(({ day, c }) => (
            <Link key={c.id} href={`/contenido/${c.id}`} className="flex items-center gap-3 py-1">
              <span className="w-16 shrink-0 text-xs font-bold text-muted">{formatShortDate(day)}</span>
              <Dot tone={c.pillar ? PILLARS[c.pillar].tone : "grey"} />
              <span className="flex-1 truncate text-sm font-bold">{c.title}</span>
              <span className="text-xs font-bold text-muted">{CONTENT_STATUSES[c.status]}</span>
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState title="Mes sin contenidos con fecha" text="Pon fecha prevista a tus contenidos para verlos aquí." />
      )}
    </>
  );
}
