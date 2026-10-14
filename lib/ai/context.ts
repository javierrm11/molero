import "server-only";

import { BRAND_DEFAULTS } from "@/lib/brand-defaults";
import {
  BLOCK_TYPES,
  BRAND_SECTION_ORDER,
  BRAND_SECTIONS,
  CONTENT_STATUSES,
  FORMATS,
  LEAD_STATUSES,
  PILLARS,
  PLATFORMS,
} from "@/lib/constants";
import { dayRange, formatTime, todayLocal } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { AiTask } from "@/lib/ai/gemini";
import type { BrandContext, Content, Lead, TimeBlock, WeeklyReview } from "@/lib/types";

// buildContext(tarea) junta el Cerebro (contexto estático) con la parte del contexto dinámico que
// necesita cada tarea. Para no mandar datos personales de leads cuando no hace falta, solo las tareas
// de ventas, revisión, chat y planificación reciben la lista de leads (y nunca notas ni contactos).

type Part = "recentContents" | "usedTopics" | "pipeline" | "leads" | "lastReview" | "agenda";

const PARTS_BY_TASK: Record<AiTask, Part[]> = {
  capture: ["usedTopics"],
  script: ["recentContents", "usedTopics"],
  hooks: ["recentContents"],
  adapt: [],
  topics: ["recentContents", "usedTopics", "lastReview"],
  lead_message: [],
  review: ["recentContents", "pipeline", "leads", "lastReview"],
  chat: ["recentContents", "usedTopics", "pipeline", "leads", "lastReview", "agenda"],
  plan_day: ["pipeline", "leads", "agenda", "lastReview"],
  context_update: [],
};

const BASE_INSTRUCTION = `Eres el asistente de Molero HQ, el centro de mando personal de Javier Ruiz Molero (marca Molero).
Respondes siempre en español de España, con el tono de Javier: cercano, directo y sin relleno.
Conoces su marca por el contexto de abajo. No inventes datos (precios, cifras, clientes): si falta algo, deja un hueco entre corchetes como [PRECIO].`;

export async function buildContext(task: AiTask, options: { date?: string } = {}): Promise<string> {
  const supabase = await createClient();
  const parts = new Set(PARTS_BY_TASK[task]);

  const { data: brandRows } = await supabase.from("brand_context").select("section, content");
  const brand = new Map((brandRows as Pick<BrandContext, "section" | "content">[] | null)?.map((r) => [r.section, r.content]));

  const sections = BRAND_SECTION_ORDER.map((section) => {
    const content = brand.get(section) ?? BRAND_DEFAULTS[section];
    return `## ${BRAND_SECTIONS[section].label}\n${content.trim()}`;
  });

  const blocks: string[] = [BASE_INSTRUCTION, `# Cerebro Molero\n${sections.join("\n\n")}`];

  if (parts.has("recentContents")) {
    const { data } = await supabase
      .from("contents")
      .select("title, pillar, format, platforms, published_at, metrics")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(15);
    const rows = (data ?? []) as Pick<Content, "title" | "pillar" | "format" | "platforms" | "published_at" | "metrics">[];
    if (rows.length > 0) {
      const lines = rows.map((c) => {
        const metrics = Object.entries(c.metrics ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        return `- ${c.published_at ?? "?"} · ${c.title} · ${c.pillar ? PILLARS[c.pillar].label : "sin pilar"} · ${
          c.format ? FORMATS[c.format] : "?"
        } · ${c.platforms.map((p) => PLATFORMS[p]).join("/")}${metrics ? ` · ${metrics}` : ""}`;
      });
      blocks.push(`# Últimos contenidos publicados\n${lines.join("\n")}`);
    }
  }

  if (parts.has("usedTopics")) {
    const { data } = await supabase.from("contents").select("title").order("created_at", { ascending: false }).limit(80);
    const titles = ((data ?? []) as Pick<Content, "title">[]).map((c) => `- ${c.title}`);
    if (titles.length > 0) blocks.push(`# Temas ya tratados o en el pipeline (no repetir)\n${titles.join("\n")}`);
  }

  if (parts.has("pipeline")) {
    const { data } = await supabase
      .from("contents")
      .select("title, status, planned_at")
      .neq("status", "published")
      .order("planned_at", { ascending: true, nullsFirst: false })
      .limit(25);
    const rows = (data ?? []) as Pick<Content, "title" | "status" | "planned_at">[];
    if (rows.length > 0) {
      blocks.push(
        `# Pipeline de contenido pendiente\n${rows
          .map((c) => `- [${CONTENT_STATUSES[c.status]}] ${c.title}${c.planned_at ? ` (previsto ${c.planned_at})` : ""}`)
          .join("\n")}`,
      );
    }
  }

  if (parts.has("leads")) {
    const { data } = await supabase
      .from("leads")
      .select("name, company, status, next_step, follow_up_at, service_interest")
      .not("status", "in", "(won,lost)")
      .order("follow_up_at", { ascending: true, nullsFirst: false })
      .limit(25);
    const rows = (data ?? []) as Pick<Lead, "name" | "company" | "status" | "next_step" | "follow_up_at" | "service_interest">[];
    if (rows.length > 0) {
      blocks.push(
        `# Leads activos\n${rows
          .map(
            (l) =>
              `- ${l.company ?? l.name} · ${LEAD_STATUSES[l.status].label}${l.service_interest ? ` · ${l.service_interest}` : ""}${
                l.next_step ? ` · próximo paso: ${l.next_step}` : ""
              }${l.follow_up_at ? ` · seguimiento ${l.follow_up_at}` : ""}`,
          )
          .join("\n")}`,
      );
    }
  }

  if (parts.has("lastReview")) {
    const { data } = await supabase
      .from("weekly_reviews")
      .select("week_start, wins, losses, ai_summary, plan")
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    const review = data as Pick<WeeklyReview, "week_start" | "wins" | "losses" | "ai_summary" | "plan"> | null;
    if (review) {
      blocks.push(
        `# Última revisión semanal (semana del ${review.week_start})\n${[
          review.ai_summary && `Resumen: ${review.ai_summary}`,
          review.wins && `Funcionó: ${review.wins}`,
          review.losses && `No funcionó: ${review.losses}`,
          review.plan && `Plan: ${review.plan}`,
        ]
          .filter(Boolean)
          .join("\n")}`,
      );
    }
  }

  if (parts.has("agenda")) {
    const date = options.date ?? todayLocal();
    const range = dayRange(date);
    const { data } = await supabase
      .from("time_blocks")
      .select("start_at, end_at, type, title, status")
      .gte("start_at", range.start)
      .lt("start_at", range.end)
      .order("start_at");
    const rows = (data ?? []) as Pick<TimeBlock, "start_at" | "end_at" | "type" | "title" | "status">[];
    blocks.push(
      `# Agenda del ${date}\n${
        rows.length > 0
          ? rows
              .map((b) => `- ${formatTime(b.start_at)}–${formatTime(b.end_at)} · ${BLOCK_TYPES[b.type].label} · ${b.title} (${b.status})`)
              .join("\n")
          : "Sin bloques todavía."
      }`,
    );
  }

  return blocks.join("\n\n");
}
