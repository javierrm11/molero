import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { addDays, formatShortDate, isValidDate, isoWeek, todayLocal, weekDays, weekStart, weekdayLetter } from "@/lib/dates";
import type { CoachReport, DailyCheckin } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ApplyChange, GenerateReport } from "./coach-actions";

export const metadata = { title: "Tu semana" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const today = todayLocal();
  const week = weekStart(isValidDate(semana) ? semana : today);
  const { supabase } = await requireUser();
  const [{ data: checkinsData }, { data: reportData }] = await Promise.all([
    supabase.from("daily_checkins").select("*").gte("date", week).lt("date", addDays(week, 7)).order("date"),
    supabase.from("coach_reports").select("*").eq("week_start", week).maybeSingle(),
  ]);
  const checkins = (checkinsData ?? []) as DailyCheckin[];
  const report = reportData as CoachReport | null;
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const moods = checkins.map((c) => c.mood).filter((m): m is number => m !== null);
  const average = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toLocaleString("es-ES", { maximumFractionDigits: 1 }) : "—";

  return (
    <>
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">
            Semana {isoWeek(week)} · {formatShortDate(week)} – {formatShortDate(addDays(week, 6))}
          </span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Tu semana</h1>
        </div>
        <div className="flex gap-1">
          <Link href={`/semana?semana=${addDays(week, -7)}`} aria-label="Semana anterior" className="flex size-10 items-center justify-center rounded-full bg-card">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <Link href={`/semana?semana=${addDays(week, 7)}`} aria-label="Semana siguiente" className="flex size-10 items-center justify-center rounded-full bg-card">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <section aria-labelledby="notas" className="flex flex-col gap-3 rounded-[26px] bg-card px-[18px] py-4">
        <div className="flex items-baseline justify-between">
          <h2 id="notas" className="text-[15px] font-extrabold">
            Nota de cada día
          </h2>
          <span className="text-xs font-bold text-muted">
            media {average} · {checkins.length} de 7 revisiones
          </span>
        </div>
        <div
          role="img"
          aria-label={weekDays(week)
            .map((d) => `${weekdayLetter(d)}: ${byDate.get(d)?.mood ?? "sin revisar"}`)
            .join(", ")}
          className="grid h-[110px] grid-cols-7 items-end gap-2"
        >
          {weekDays(week).map((d) => {
            const mood = byDate.get(d)?.mood ?? null;
            return (
              <div key={d} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "w-full rounded-[10px]",
                    mood === null ? "h-[18px] border-2 border-dashed border-[#B8C4BE]" : mood <= 2 ? "bg-[#C2531F]" : "bg-accent",
                  )}
                  style={mood === null ? undefined : { height: `${mood * 18}px` }}
                />
                <span className={cn("text-[11px] font-bold", d === today ? "text-accent" : "text-muted")}>{weekdayLetter(d)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {report ? (
        <>
          <section aria-labelledby="bien" className="flex flex-col gap-2 rounded-[26px] bg-card px-[18px] py-4">
            <h2 id="bien" className="text-[15px] font-extrabold">
              Lo que ha ido bien
            </h2>
            <ul className="flex list-disc flex-col gap-1 pl-[18px] text-sm leading-snug">
              {report.good.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>
          {report.pattern ? (
            <section className="flex flex-col gap-1.5 rounded-[26px] bg-peach-tint px-[18px] py-4 text-peach-ink">
              <h2 className="text-[15px] font-extrabold">Lo que se repite</h2>
              <p className="text-sm leading-snug">{report.pattern}</p>
            </section>
          ) : null}
          {report.one_change ? (
            <section className="flex flex-col gap-2.5 rounded-[26px] bg-accent p-[18px] text-white">
              <h2 className="text-xs font-bold tracking-[0.6px] text-accent-soft">UN SOLO CAMBIO PARA LA SEMANA {isoWeek(addDays(week, 7))}</h2>
              <p className="text-[17px] leading-snug font-extrabold">{report.one_change}</p>
              {report.change_block ? <ApplyChange reportId={report.id} applied={report.applied} /> : null}
            </section>
          ) : null}
          <GenerateReport week={week} label="Volver a analizar" />
        </>
      ) : checkins.length > 0 ? (
        <GenerateReport week={week} label="Analizar mi semana" />
      ) : (
        <p className="rounded-[22px] bg-card p-4 text-sm text-muted">
          Haz la revisión de cada noche y aquí verás tus patrones. El domingo por la noche el informe se prepara solo.
        </p>
      )}

      <Link href="/noche" className="flex h-[52px] items-center justify-center rounded-[18px] bg-accent text-[15px] font-extrabold text-white">
        Revisar hoy
      </Link>
    </>
  );
}
