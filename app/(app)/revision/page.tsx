import { Check, Inbox } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { CONTENT_STATUSES, GOAL_METRICS, NETWORKS, PLATFORMS } from "@/lib/constants";
import { getWeekGoals, inboxCount } from "@/lib/data";
import { addDays, dayRange, formatShortDate, isoWeek, todayLocal, weekStart, weekdayLetter } from "@/lib/dates";
import type { Content, GoalMetric, WeeklyReview } from "@/lib/types";
import { cn } from "@/lib/utils";

import { savePlan, saveMetrics } from "./actions";
import { SummaryStep } from "./summary-step";

export const metadata = { title: "Revisión semanal" };

const STEPS = ["Métricas", "Bandeja", "Resultados", "Resumen IA", "Plan"];

const thousands = new Intl.NumberFormat("es-ES");

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const { paso } = await searchParams;
  const { supabase } = await requireUser();
  const today = todayLocal();
  // El lunes se revisa la semana que acaba de terminar; el resto de días, la semana en curso.
  const week = weekdayLetter(today) === "L" ? addDays(weekStart(today), -7) : weekStart(today);
  const done = paso === "hecho";
  const step = done ? 6 : Math.min(Math.max(Number(paso) || 1, 1), 5);

  const [{ data: reviewData }, { data: previousData }] = await Promise.all([
    supabase.from("weekly_reviews").select("*").eq("week_start", week).maybeSingle(),
    supabase.from("weekly_reviews").select("metrics").lt("week_start", week).order("week_start", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const review = reviewData as WeeklyReview | null;
  const previous = (previousData?.metrics ?? {}) as WeeklyReview["metrics"];

  return (
    <>
      <PageHeader title="Revisión semanal" eyebrow={`Semana ${isoWeek(week)} · ${formatShortDate(week)} – ${formatShortDate(addDays(week, 6))}`} back="/" />

      <ol aria-label="Pasos" className="grid grid-cols-5 gap-1.5">
        {STEPS.map((label, i) => (
          <li key={label}>
            <Link href={`/revision?paso=${i + 1}`} aria-current={step === i + 1 ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className={cn("h-1.5 rounded-full", i + 1 <= step ? "bg-accent" : "bg-line")} />
              <span className={cn("text-[10px] font-bold", step === i + 1 ? "text-ink" : "text-muted")}>{label}</span>
            </Link>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <form action={saveMetrics.bind(null, week)} className="flex flex-col gap-3.5">
          <section className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
            <h2 className="text-base font-extrabold">Seguidores y alcance</h2>
            <p className="text-[13px] text-muted">El valor gris es el de la última revisión. Deja vacío lo que no quieras apuntar.</p>
            {NETWORKS.map((n) => (
              <div key={n} className="grid grid-cols-[88px_1fr_1fr] items-end gap-2">
                <span className="pb-3.5 text-sm font-bold">{PLATFORMS[n]}</span>
                <Field label="Seguidores" htmlFor={`${n}-f`}>
                  <Input
                    id={`${n}-f`}
                    name={`${n}_followers`}
                    inputMode="numeric"
                    defaultValue={review?.metrics?.[n]?.followers ?? ""}
                    placeholder={previous[n]?.followers !== undefined ? thousands.format(previous[n]?.followers ?? 0) : "—"}
                  />
                </Field>
                <Field label="Alcance" htmlFor={`${n}-r`}>
                  <Input
                    id={`${n}-r`}
                    name={`${n}_reach`}
                    inputMode="numeric"
                    defaultValue={review?.metrics?.[n]?.reach ?? ""}
                    placeholder={previous[n]?.reach !== undefined ? thousands.format(previous[n]?.reach ?? 0) : "—"}
                  />
                </Field>
              </div>
            ))}
          </section>
          <SubmitButton size="lg" pendingText="Guardando…">
            Siguiente: bandeja
          </SubmitButton>
        </form>
      ) : null}

      {step === 2 ? <InboxStep count={await inboxCount(supabase)} /> : null}

      {step === 3 ? <ResultsStep week={week} metrics={review?.metrics ?? {}} previous={previous} /> : null}

      {step === 4 ? (
        <>
          <SummaryStep
            week={week}
            initialSummary={review?.ai_summary ?? null}
            initialWins={review?.wins ?? ""}
            initialLosses={review?.losses ?? ""}
          />
          <Link href="/revision?paso=5" className="flex h-[54px] items-center justify-center rounded-[18px] bg-accent text-[15px] font-bold text-white">
            Siguiente: el plan
          </Link>
        </>
      ) : null}

      {step === 5 ? <PlanStep week={week} plan={review?.plan ?? ""} /> : null}

      {done ? (
        <section className="flex flex-col items-center gap-3 rounded-[26px] bg-accent p-6 text-center text-white">
          <span className="flex size-14 items-center justify-center rounded-full bg-card text-accent">
            <Check className="size-7" strokeWidth={2.6} aria-hidden />
          </span>
          <h2 className="text-xl font-extrabold">Semana cerrada</h2>
          <p className="text-sm text-[#e1f5ec]">Plan y objetivos guardados. Ahora, a llevarlo a la agenda.</p>
          <Link
            href={`/asistente?plan=${weekdayLetter(today) === "L" ? today : addDays(today, 1)}`}
            className="flex h-12 w-full items-center justify-center rounded-[16px] bg-card text-sm font-extrabold text-accent-dark"
          >
            Organizar el próximo día con IA
          </Link>
        </section>
      ) : null}
    </>
  );
}

function InboxStep({ count }: { count: number }) {
  return (
    <>
      <section className="flex flex-col items-center gap-3 rounded-[26px] bg-card p-6 text-center">
        <Inbox className="size-9 text-accent" aria-hidden />
        <h2 className="text-xl font-extrabold">{count === 0 ? "Bandeja vacía" : `${count} capturas sin procesar`}</h2>
        <p className="text-sm text-muted">
          {count === 0 ? "No hay nada pendiente." : "Conviértelas en contenidos, leads o bloques de agenda, o archívalas."}
        </p>
        {count > 0 ? (
          <Link href="/bandeja?from=revision" className="flex h-12 w-full items-center justify-center rounded-[16px] bg-accent text-sm font-bold text-white">
            Procesar ahora
          </Link>
        ) : null}
      </section>
      <Link href="/revision?paso=3" className="flex h-[54px] items-center justify-center rounded-[18px] bg-card text-[15px] font-bold">
        {count > 0 ? "Saltar por ahora" : "Siguiente: resultados"}
      </Link>
    </>
  );
}

async function ResultsStep({
  week,
  metrics,
  previous,
}: {
  week: string;
  metrics: WeeklyReview["metrics"];
  previous: WeeklyReview["metrics"];
}) {
  const { supabase } = await requireUser();
  const end = addDays(week, 7);
  const [goals, planned, published, blocks] = await Promise.all([
    getWeekGoals(supabase, week),
    supabase.from("contents").select("id, title, status").neq("status", "published").gte("planned_at", week).lt("planned_at", end),
    supabase.from("contents").select("id, title, status").eq("status", "published").gte("published_at", week).lt("published_at", end),
    supabase.from("time_blocks").select("status").gte("start_at", dayRange(week).start).lt("start_at", dayRange(end).start),
  ]);
  const contents = [...((published.data ?? []) as Content[]), ...((planned.data ?? []) as Content[])];
  const blockRows = (blocks.data ?? []) as { status: string }[];

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-[26px] bg-card p-[18px]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-extrabold">Contenido</h2>
          <span className="text-[22px] font-extrabold">
            {goals.contents.actual}
            <span className="text-[15px] text-muted">/{goals.contents.target}</span>
          </span>
        </div>
        {contents.length === 0 ? <p className="text-sm text-muted">Nada planificado ni publicado esta semana.</p> : null}
        <ul className="flex flex-col gap-2 text-sm">
          {contents.map((c) => (
            <li key={c.id} className={cn("flex items-center gap-2.5", c.status !== "published" && "text-muted")}>
              <span
                aria-label={c.status === "published" ? "Publicado" : CONTENT_STATUSES[c.status]}
                role="img"
                className={cn(
                  "flex size-[22px] shrink-0 items-center justify-center rounded-full",
                  c.status === "published" ? "bg-accent text-white" : "border-2 border-dashed border-[#9aa1b0]",
                )}
              >
                {c.status === "published" ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
              </span>
              {c.title}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-0.5 rounded-[20px] bg-peach-tint py-3 text-peach-ink">
          <span className="text-xl font-extrabold">
            {goals.contacts.actual}/{goals.contacts.target}
          </span>
          <span className="text-xs font-bold">contactos</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[20px] bg-accent-tint py-3 text-accent-dark">
          <span className="text-xl font-extrabold">
            {blockRows.filter((b) => b.status === "done").length}/{blockRows.length}
          </span>
          <span className="text-xs font-bold">bloques hechos</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[20px] bg-violet-tint py-3 text-violet-ink">
          <span className="text-xl font-extrabold">{blockRows.filter((b) => b.status === "skipped").length}</span>
          <span className="text-xs font-bold">saltados</span>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-[26px] bg-card p-[18px]">
        <h2 className="text-base font-extrabold">Seguidores</h2>
        {NETWORKS.map((n) => {
          const now = metrics[n]?.followers;
          const before = previous[n]?.followers;
          const delta = now !== undefined && before !== undefined ? now - before : null;
          return (
            <div key={n} className="flex justify-between text-sm">
              <span>{PLATFORMS[n]}</span>
              <span>
                {now !== undefined ? <strong className="font-extrabold">{thousands.format(now)}</strong> : <span className="text-muted">sin apuntar</span>}
                {delta !== null ? (
                  <span className={cn("ml-2 font-extrabold", delta >= 0 ? "text-accent" : "text-danger")}>
                    {delta >= 0 ? "+" : ""}
                    {thousands.format(delta)}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </section>

      <Link href="/revision?paso=4" className="flex h-[54px] items-center justify-center rounded-[18px] bg-accent text-[15px] font-bold text-white">
        Siguiente: resumen con IA
      </Link>
    </>
  );
}

async function PlanStep({ week, plan }: { week: string; plan: string }) {
  const { supabase } = await requireUser();
  const next = addDays(week, 7);
  const goals = await getWeekGoals(supabase, next);
  return (
    <form action={savePlan.bind(null, week)} className="flex flex-col gap-3.5">
      <section className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 className="text-base font-extrabold">Objetivos de la semana {isoWeek(next)}</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(GOAL_METRICS) as GoalMetric[]).map((metric) => (
            <Field key={metric} label={GOAL_METRICS[metric].label} htmlFor={`goal-${metric}`}>
              <Input id={`goal-${metric}`} name={`goal_${metric}`} type="number" min={0} max={100} defaultValue={goals[metric].target} />
            </Field>
          ))}
        </div>
        <Field label="Plan y prioridades" htmlFor="plan" hint="Qué vas a grabar, a quién vas a escribir y qué cambiar.">
          <Textarea id="plan" name="plan" rows={5} defaultValue={plan} />
        </Field>
      </section>
      <SubmitButton size="lg" pendingText="Guardando…">
        Cerrar la semana
      </SubmitButton>
    </form>
  );
}
