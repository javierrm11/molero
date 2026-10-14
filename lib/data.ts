import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { BRAND_DEFAULTS } from "@/lib/brand-defaults";
import { BRAND_SECTION_ORDER, DEFAULT_SERVICES, DEFAULT_TEMPLATES, GOAL_METRICS } from "@/lib/constants";
import { addDays, dayRange, weekStart } from "@/lib/dates";
import type { BlockTemplate, Goal, GoalMetric, Settings } from "@/lib/types";

// Consultas compartidas y datos por defecto que se crean la primera vez que hacen falta.

export async function getSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data } = await supabase.from("settings").select("*").maybeSingle();
  if (data) return data as Settings;
  const { data: created, error } = await supabase.from("settings").insert({}).select("*").single();
  if (error) throw error;
  return created as Settings;
}

export async function ensureBrandContext(supabase: SupabaseClient) {
  const { data } = await supabase.from("brand_context").select("section");
  const existing = new Set((data ?? []).map((r: { section: string }) => r.section));
  const missing = BRAND_SECTION_ORDER.filter((s) => !existing.has(s)).map((section) => ({
    section,
    content: BRAND_DEFAULTS[section],
  }));
  if (missing.length > 0) await supabase.from("brand_context").insert(missing);
}

export async function getTemplates(supabase: SupabaseClient): Promise<BlockTemplate[]> {
  const { data } = await supabase.from("block_templates").select("id, name, blocks").order("created_at");
  if (data && data.length > 0) return data as BlockTemplate[];
  const { data: created } = await supabase.from("block_templates").insert(DEFAULT_TEMPLATES).select("id, name, blocks");
  return (created ?? []) as BlockTemplate[];
}

export async function ensureServices(supabase: SupabaseClient) {
  const { count } = await supabase.from("services").select("id", { count: "exact", head: true });
  if (count === 0) await supabase.from("services").insert(DEFAULT_SERVICES);
}

/** Objetivos de la semana (se crean con los valores por defecto si no existen). */
export async function getWeekGoals(supabase: SupabaseClient, date: string): Promise<Record<GoalMetric, Goal>> {
  const week = weekStart(date);
  const { data } = await supabase.from("goals").select("*").eq("week_start", week);
  const rows = (data ?? []) as Goal[];
  const missing = (Object.keys(GOAL_METRICS) as GoalMetric[]).filter((m) => !rows.some((g) => g.metric === m));
  if (missing.length > 0) {
    // Arrastra el objetivo de la semana anterior si existe.
    const { data: previous } = await supabase.from("goals").select("metric, target").eq("week_start", addDays(week, -7));
    const prevTargets = new Map((previous ?? []).map((g: { metric: string; target: number }) => [g.metric, g.target]));
    const { data: created } = await supabase
      .from("goals")
      .insert(
        missing.map((metric) => ({
          week_start: week,
          metric,
          target: prevTargets.get(metric) ?? GOAL_METRICS[metric].defaultTarget,
        })),
      )
      .select("*");
    rows.push(...((created ?? []) as Goal[]));
  }
  const progress = await getWeekProgress(supabase, date);
  const byMetric = Object.fromEntries(rows.map((g) => [g.metric, { ...g, actual: progress[g.metric] }]));
  return byMetric as Record<GoalMetric, Goal>;
}

/** Progreso real de la semana: contenidos publicados e interacciones con leads. */
export async function getWeekProgress(supabase: SupabaseClient, date: string): Promise<Record<GoalMetric, number>> {
  const week = weekStart(date);
  const end = addDays(week, 7);
  const [contents, contacts] = await Promise.all([
    supabase
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", week)
      .lt("published_at", end),
    supabase.from("interactions").select("id", { count: "exact", head: true }).gte("date", week).lt("date", end),
  ]);
  return { contents: contents.count ?? 0, contacts: contacts.count ?? 0 };
}

export async function getBlocksForDay(supabase: SupabaseClient, date: string) {
  const range = dayRange(date);
  const { data } = await supabase
    .from("time_blocks")
    .select("*")
    .gte("start_at", range.start)
    .lt("start_at", range.end)
    .order("start_at");
  return data ?? [];
}

export async function inboxCount(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase.from("captures").select("id", { count: "exact", head: true }).eq("processed", false);
  return count ?? 0;
}
