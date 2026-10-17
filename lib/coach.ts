import "server-only";

import { buildContext } from "@/lib/ai/context";
import { generateJson, type ServerScope } from "@/lib/ai/gemini";
import { coachPrompt, coachSchema, nightPrompt, nightSchema } from "@/lib/ai/prompts";
import { BLOCK_TYPES } from "@/lib/constants";
import { addDays, dayRange, formatTime } from "@/lib/dates";
import type { BlockType, CoachReport, DailyCheckin, TimeBlock } from "@/lib/types";

// Revisión nocturna (cada noche) e informe semanal de hábitos.

export interface DayStats {
  total: number;
  done: number;
  skipped: number;
  lines: string[];
}

export async function dayStats(scope: ServerScope, date: string): Promise<DayStats> {
  const range = dayRange(date);
  const { data } = await scope.client
    .from("time_blocks")
    .select("start_at, end_at, type, title, status")
    .eq("user_id", scope.userId)
    .gte("start_at", range.start)
    .lt("start_at", range.end)
    .order("start_at");
  const blocks = ((data ?? []) as Pick<TimeBlock, "start_at" | "end_at" | "type" | "title" | "status">[]).filter((b) => b.type !== "rest");
  return {
    total: blocks.length,
    done: blocks.filter((b) => b.status === "done").length,
    skipped: blocks.filter((b) => b.status === "skipped").length,
    lines: blocks.map(
      (b) =>
        `${formatTime(b.start_at)}–${formatTime(b.end_at)} ${BLOCK_TYPES[b.type].label} · ${b.title}: ${
          { planned: "sin empezar", active: "empezado", done: "hecho", skipped: "saltado" }[b.status]
        }`,
    ),
  };
}

export async function runNightCheckin(scope: ServerScope, date: string, mood: number | null, note: string): Promise<DailyCheckin> {
  const [stats, history] = await Promise.all([
    dayStats(scope, date),
    scope.client
      .from("daily_checkins")
      .select("date, mood, note, ai_improve")
      .eq("user_id", scope.userId)
      .lt("date", date)
      .gte("date", addDays(date, -7))
      .order("date"),
  ]);
  const historyText = ((history.data ?? []) as Pick<DailyCheckin, "date" | "mood" | "note" | "ai_improve">[])
    .map((c) => `- ${c.date} · nota ${c.mood ?? "?"} · ${c.note ?? ""} · mejora propuesta: ${c.ai_improve ?? ""}`)
    .join("\n");

  const ai = await generateJson({
    task: "night_checkin",
    tier: "fast",
    scope,
    system: await buildContext("night_checkin", { date, scope }),
    prompt: nightPrompt({
      date,
      mood,
      note,
      stats: `${stats.done} hechos, ${stats.skipped} saltados, de ${stats.total}.\n${stats.lines.join("\n")}`,
      history: historyText,
    }),
    schema: nightSchema,
  });

  const tomorrow = ai.tomorrow ? { ...ai.tomorrow, date: addDays(date, 1), type: ai.tomorrow.type as BlockType } : null;
  const { data, error } = await scope.client
    .from("daily_checkins")
    .upsert(
      {
        user_id: scope.userId,
        date,
        mood,
        note: note || null,
        ai_good: ai.good,
        ai_improve: ai.improve,
        ai_tomorrow: tomorrow,
        applied: false,
      },
      { onConflict: "user_id,date" },
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("No se ha guardado la revisión");
  return data as DailyCheckin;
}

export async function buildCoachReport(scope: ServerScope, weekStart: string): Promise<CoachReport> {
  const end = addDays(weekStart, 7);
  const [checkins, blocks] = await Promise.all([
    scope.client.from("daily_checkins").select("*").eq("user_id", scope.userId).gte("date", weekStart).lt("date", end).order("date"),
    scope.client
      .from("time_blocks")
      .select("start_at, end_at, type, status")
      .eq("user_id", scope.userId)
      .gte("start_at", dayRange(weekStart).start)
      .lt("start_at", dayRange(end).start),
  ]);
  const rows = (checkins.data ?? []) as DailyCheckin[];
  const blockRows = (blocks.data ?? []) as Pick<TimeBlock, "start_at" | "end_at" | "type" | "status">[];
  const skippedByHour = new Map<string, number>();
  for (const b of blockRows.filter((b) => b.status === "skipped")) {
    const h = formatTime(b.start_at).slice(0, 2);
    skippedByHour.set(h, (skippedByHour.get(h) ?? 0) + 1);
  }

  const data = [
    `Semana del ${weekStart}. ${rows.length} revisiones nocturnas.`,
    ...rows.map((c) => `- ${c.date}: nota ${c.mood ?? "?"} · «${c.note ?? ""}» · bien: ${c.ai_good ?? ""} · mejora: ${c.ai_improve ?? ""}`),
    `Bloques: ${blockRows.filter((b) => b.status === "done").length} hechos, ${blockRows.filter((b) => b.status === "skipped").length} saltados de ${blockRows.length}.`,
    `Bloques saltados por hora de inicio: ${[...skippedByHour.entries()].map(([h, n]) => `${h}:00 → ${n}`).join(", ") || "ninguno"}.`,
  ].join("\n");

  const ai = await generateJson({
    task: "coach_week",
    tier: "pro",
    scope,
    system: await buildContext("coach_week", { scope }),
    prompt: coachPrompt(data),
    schema: coachSchema,
  });

  const { data: saved, error } = await scope.client
    .from("coach_reports")
    .upsert(
      {
        user_id: scope.userId,
        week_start: weekStart,
        good: ai.good,
        pattern: ai.pattern,
        one_change: ai.one_change,
        change_block: ai.change_block,
        applied: false,
      },
      { onConflict: "user_id,week_start" },
    )
    .select("*")
    .single();
  if (error || !saved) throw error ?? new Error("No se ha guardado el informe");
  return saved as CoachReport;
}
