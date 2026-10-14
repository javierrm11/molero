import { BLOCK_TYPES, BRAND_SECTIONS, FORMATS, LEAD_SOURCES, PILLARS, PLATFORMS } from "@/lib/constants";
import type { CaptureAi } from "@/lib/ai/prompts";
import type { BlockType, BrandSection, ContentFormat, LeadSource, Pillar, Platform } from "@/lib/types";

/** Resumen legible de lo que la IA ha entendido en una captura. */
export function describeCapture(ai: Partial<CaptureAi> | null | undefined): string[] {
  if (!ai) return [];
  const lines: string[] = [];
  if (ai.idea) {
    const { pillar, format, platforms, hook } = ai.idea;
    const meta = [
      pillar ? PILLARS[pillar as Pillar]?.label : null,
      format ? FORMATS[format as ContentFormat] : null,
      platforms?.length ? platforms.map((p) => PLATFORMS[p as Platform]).join(", ") : null,
    ].filter(Boolean);
    if (meta.length) lines.push(meta.join(" · "));
    if (hook) lines.push(`Hook: “${hook}”`);
  }
  if (ai.lead) {
    const l = ai.lead;
    lines.push([l.company ?? l.name, l.city, l.service_interest].filter(Boolean).join(" · "));
    if (l.source) lines.push(`Origen: ${LEAD_SOURCES[l.source as LeadSource] ?? l.source}`);
    if (l.next_step) lines.push(`Próximo paso: ${l.next_step}${l.follow_up_at ? ` (${l.follow_up_at})` : ""}`);
  }
  if (ai.task) {
    const t = ai.task;
    const when = [t.date, t.time].filter(Boolean).join(" ");
    lines.push(
      [t.block_type ? BLOCK_TYPES[t.block_type as BlockType]?.label : null, when ? `para ${when}` : null].filter(Boolean).join(" · "),
    );
  }
  if (ai.context) {
    lines.push(`Cerebro → ${BRAND_SECTIONS[ai.context.section as BrandSection]?.label ?? ai.context.section}`);
    lines.push(ai.context.note);
  }
  return lines.filter((l) => l.trim() !== "");
}
