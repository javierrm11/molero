"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generate } from "@/lib/ai/gemini";
import { reviewPrompt } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { CONTENT_STATUSES, NETWORKS, PLATFORMS } from "@/lib/constants";
import { addDays, dayRange } from "@/lib/dates";
import type { Content, GoalMetric, WeeklyReview } from "@/lib/types";
import { formText } from "@/lib/utils";

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

export async function saveMetrics(week: string, form: FormData) {
  const metrics: WeeklyReview["metrics"] = {};
  for (const network of NETWORKS) {
    const followers = toNumber(formText(form, `${network}_followers`));
    const reach = toNumber(formText(form, `${network}_reach`));
    if (followers !== undefined || reach !== undefined) metrics[network] = { followers, reach };
  }
  const { supabase } = await requireUser();
  await supabase.from("weekly_reviews").upsert({ week_start: week, metrics }, { onConflict: "user_id,week_start" });
  revalidatePath("/revision");
  redirect("/revision?paso=2");
}

export async function generateSummary(week: string, wins: string, losses: string): Promise<{ data?: string; error?: string }> {
  const { supabase } = await requireUser();
  const end = addDays(week, 7);
  const range = { start: dayRange(week).start, end: dayRange(end).start };

  const [published, planned, contacts, blocks, review, previous, goals] = await Promise.all([
    supabase.from("contents").select("title, platforms").eq("status", "published").gte("published_at", week).lt("published_at", end),
    supabase.from("contents").select("title, status").neq("status", "published").gte("planned_at", week).lt("planned_at", end),
    supabase.from("interactions").select("id", { count: "exact", head: true }).gte("date", week).lt("date", end),
    supabase.from("time_blocks").select("type, status").gte("start_at", range.start).lt("start_at", range.end),
    supabase.from("weekly_reviews").select("metrics").eq("week_start", week).maybeSingle(),
    supabase.from("weekly_reviews").select("metrics").lt("week_start", week).order("week_start", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("goals").select("metric, target").eq("week_start", week),
  ]);

  const target = (metric: GoalMetric) =>
    ((goals.data ?? []) as { metric: GoalMetric; target: number }[]).find((g) => g.metric === metric)?.target ?? 0;
  const blockRows = (blocks.data ?? []) as { type: string; status: string }[];
  const metrics = (review.data?.metrics ?? {}) as WeeklyReview["metrics"];
  const prevMetrics = (previous.data?.metrics ?? {}) as WeeklyReview["metrics"];

  const data = [
    `Semana del ${week}.`,
    `Contenidos publicados: ${(published.data ?? []).length} de ${target("contents")} objetivo.`,
    ...((published.data ?? []) as Pick<Content, "title" | "platforms">[]).map(
      (c) => `- Publicado: ${c.title} (${c.platforms.map((p) => PLATFORMS[p]).join(", ")})`,
    ),
    ...((planned.data ?? []) as Pick<Content, "title" | "status">[]).map((c) => `- Planificado y no publicado: ${c.title} (${CONTENT_STATUSES[c.status]})`),
    `Contactos (interacciones con leads): ${contacts.count ?? 0} de ${target("contacts")} objetivo.`,
    `Bloques de agenda: ${blockRows.filter((b) => b.status === "done").length} hechos, ${blockRows.filter((b) => b.status === "skipped").length} saltados, de ${blockRows.length}.`,
    "Seguidores por red (esta semana / anterior):",
    ...NETWORKS.map(
      (n) => `- ${PLATFORMS[n]}: ${metrics[n]?.followers ?? "?"} / ${prevMetrics[n]?.followers ?? "?"}${metrics[n]?.reach ? ` · alcance ${metrics[n]?.reach}` : ""}`,
    ),
    wins.trim() && `Javier dice que funcionó: ${wins.trim()}`,
    losses.trim() && `Javier dice que no funcionó: ${losses.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const summary = await generate({
      task: "review",
      tier: "pro",
      system: await buildContext("review"),
      prompt: reviewPrompt(data),
    });
    await supabase
      .from("weekly_reviews")
      .upsert(
        { week_start: week, ai_summary: summary, wins: wins.trim() || null, losses: losses.trim() || null },
        { onConflict: "user_id,week_start" },
      );
    revalidatePath("/revision");
    return { data: summary };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function savePlan(week: string, form: FormData) {
  const next = addDays(week, 7);
  const plan = formText(form, "plan") ?? null;
  const { supabase } = await requireUser();
  await supabase.from("weekly_reviews").upsert({ week_start: week, plan }, { onConflict: "user_id,week_start" });
  const goals = (["contents", "contacts"] as GoalMetric[])
    .map((metric) => ({ metric, target: toNumber(formText(form, `goal_${metric}`)) }))
    .filter((g): g is { metric: GoalMetric; target: number } => g.target !== undefined)
    .map((g) => ({ week_start: next, metric: g.metric, target: g.target }));
  if (goals.length > 0) await supabase.from("goals").upsert(goals, { onConflict: "user_id,week_start,metric" });
  revalidatePath("/revision");
  revalidatePath("/");
  redirect("/revision?paso=hecho");
}
