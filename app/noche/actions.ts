"use server";

import { revalidatePath } from "next/cache";

import { aiErrorMessage } from "@/lib/ai/gemini";
import { sessionScope } from "@/lib/auth";
import { BLOCK_TYPES } from "@/lib/constants";
import { buildCoachReport, runNightCheckin } from "@/lib/coach";
import { addDays, todayLocal, zonedToUtc } from "@/lib/dates";
import type { BlockType, CoachReport, DailyCheckin } from "@/lib/types";

export type CheckinState = { error?: string; checkin?: DailyCheckin } | undefined;

export async function submitCheckin(_: CheckinState, form: FormData): Promise<CheckinState> {
  const moodRaw = Number(form.get("mood"));
  const mood = Number.isInteger(moodRaw) && moodRaw >= 1 && moodRaw <= 5 ? moodRaw : null;
  const note = String(form.get("note") ?? "").trim().slice(0, 3000);
  if (!mood && !note) return { error: "Ponle una nota al día o cuéntame algo." };
  try {
    const checkin = await runNightCheckin(await sessionScope(), todayLocal(), mood, note);
    revalidatePath("/noche");
    revalidatePath("/semana");
    return { checkin };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

function blockRow(date: string, b: { start: string; end: string; type: BlockType; title: string }) {
  return {
    start_at: zonedToUtc(date, b.start).toISOString(),
    end_at: zonedToUtc(date, b.end).toISOString(),
    type: b.type,
    title: b.title,
    checklist: BLOCK_TYPES[b.type].checklist.map((label) => ({ label, done: false })),
  };
}

export async function applyTomorrow(checkinId: string): Promise<{ error?: string }> {
  const { client } = await sessionScope();
  const { data } = await client.from("daily_checkins").select("*").eq("id", checkinId).single();
  const checkin = data as DailyCheckin | null;
  if (!checkin?.ai_tomorrow) return { error: "No hay nada que aplicar." };
  if (checkin.ai_tomorrow.end <= checkin.ai_tomorrow.start) return { error: "El bloque propuesto no es válido." };
  const { error } = await client.from("time_blocks").insert(blockRow(checkin.ai_tomorrow.date, checkin.ai_tomorrow));
  if (error) return { error: "No se ha podido crear el bloque." };
  await client.from("daily_checkins").update({ applied: true }).eq("id", checkinId);
  revalidatePath("/noche");
  revalidatePath("/agenda");
  return {};
}

export async function generateCoachReport(week: string): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return { error: "Semana no válida." };
  try {
    await buildCoachReport(await sessionScope(), week);
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
  revalidatePath("/semana");
  return {};
}

/** Pone el bloque del «único cambio» de lunes a viernes de la semana siguiente. */
export async function applyCoachChange(reportId: string): Promise<{ error?: string }> {
  const { client } = await sessionScope();
  const { data } = await client.from("coach_reports").select("*").eq("id", reportId).single();
  const report = data as CoachReport | null;
  const block = report?.change_block;
  if (!report || !block || block.end <= block.start) return { error: "No hay un bloque que aplicar." };
  const next = addDays(report.week_start, 7);
  const { error } = await client.from("time_blocks").insert([0, 1, 2, 3, 4].map((d) => blockRow(addDays(next, d), block)));
  if (error) return { error: "No se ha podido crear los bloques." };
  await client.from("coach_reports").update({ applied: true }).eq("id", reportId);
  revalidatePath("/semana");
  revalidatePath("/agenda");
  return {};
}
