import "server-only";

import { buildContext } from "@/lib/ai/context";
import { generateJson, type ServerScope } from "@/lib/ai/gemini";
import { briefingPrompt, briefingSchema } from "@/lib/ai/prompts";
import { appUrl } from "@/lib/app-url";
import { BLOCK_TYPES, LEAD_STATUSES } from "@/lib/constants";
import { dayRange, formatLongDate, formatTime, minutesBetween } from "@/lib/dates";
import { getLifePanel } from "@/lib/integrations/google";
import { sendTelegram, tgEscape } from "@/lib/integrations/telegram";
import type { Briefing, Lead, TimeBlock } from "@/lib/types";

// Resumen matinal: junta Google (calendario, correo, tareas) con la agenda y el CRM de Molero,
// Gemini lo ordena y se guarda en `briefings`. El cron lo manda además por Telegram.

const SOURCE_LABEL: Record<Briefing["items"][number]["source"], string> = {
  gmail: "Gmail",
  calendar: "Calendario",
  tasks: "Tareas",
  crm: "CRM",
  contenido: "Contenido",
  uco: "UCO",
  agenda: "Agenda",
};

export async function buildBriefing(scope: ServerScope, date: string): Promise<Briefing> {
  const { client, userId } = scope;
  const range = dayRange(date);
  const [panel, leadsRes, blocksRes] = await Promise.all([
    getLifePanel(client, userId, date),
    client
      .from("leads")
      .select("name, company, status, next_step, follow_up_at")
      .eq("user_id", userId)
      .lte("follow_up_at", date)
      .not("status", "in", "(won,lost)")
      .limit(10),
    client
      .from("time_blocks")
      .select("start_at, end_at, type, title, status")
      .eq("user_id", userId)
      .gte("start_at", range.start)
      .lt("start_at", range.end)
      .order("start_at"),
  ]);
  const leads = (leadsRes.data ?? []) as Pick<Lead, "name" | "company" | "status" | "next_step" | "follow_up_at">[];
  const blocks = (blocksRes.data ?? []) as Pick<TimeBlock, "start_at" | "end_at" | "type" | "title" | "status">[];

  const data = [
    "## Calendario de Google",
    panel.events.length
      ? panel.events.map((e) => `- ${e.allDay ? "Todo el día" : `${formatTime(e.start)}–${formatTime(e.end)}`} · ${e.title}${e.meet ? " (Meet)" : ""}`).join("\n")
      : panel.connected
        ? "Sin eventos."
        : "Google no conectado.",
    `## Correo sin leer (${panel.unread})`,
    panel.emails.map((m) => `- De: ${m.from} · Asunto: ${m.subject} · ${m.snippet.slice(0, 180)}`).join("\n") || "Nada importante.",
    "## Tareas pendientes",
    panel.tasks.map((t) => `- ${t.title}${t.due ? ` (vence ${t.due})` : ""}`).join("\n") || "Ninguna.",
    "## Agenda de Molero",
    blocks.map((b) => `- ${formatTime(b.start_at)}–${formatTime(b.end_at)} · ${BLOCK_TYPES[b.type].label} · ${b.title}`).join("\n") ||
      "Sin bloques.",
    "## Seguimientos de leads",
    leads
      .map((l) => `- ${l.company ?? l.name} · ${LEAD_STATUSES[l.status].label}${l.next_step ? ` · ${l.next_step}` : ""}`)
      .join("\n") || "Ninguno.",
  ].join("\n");

  const ai = await generateJson({
    task: "briefing",
    tier: "fast",
    scope,
    system: await buildContext("briefing", { date, scope }),
    prompt: briefingPrompt(formatLongDate(date), data),
    schema: briefingSchema,
  });

  const stats = {
    emails: panel.unread,
    tasks: panel.tasks.length,
    follow_ups: leads.length,
    blocks: blocks.length,
    minutes: blocks.filter((b) => b.type !== "rest").reduce((s, b) => s + minutesBetween(b.start_at, b.end_at), 0),
  };

  const { data: saved, error } = await client
    .from("briefings")
    .upsert({ user_id: userId, date, focus: ai.focus, summary: ai.summary, items: ai.items, stats }, { onConflict: "user_id,date" })
    .select("*")
    .single();
  if (error || !saved) throw error ?? new Error("No se ha guardado el resumen");
  return saved as Briefing;
}

export async function sendBriefing(scope: ServerScope, briefing: Briefing, chatId: string) {
  const lines = [
    "<b>Buenos días, Javier</b>",
    "",
    `<b>Foco:</b> ${tgEscape(briefing.focus)}`,
    "",
    tgEscape(briefing.summary),
    "",
    ...briefing.items.map((i) => `• <b>${SOURCE_LABEL[i.source]}</b> · ${tgEscape(i.text)}`),
  ];
  await sendTelegram(chatId, lines.join("\n"), { text: "Abrir el resumen", url: `${await appUrl()}/resumen` });
  await scope.client.from("briefings").update({ sent_at: new Date().toISOString() }).eq("id", briefing.id);
}

export { SOURCE_LABEL as BRIEFING_SOURCE_LABEL };
