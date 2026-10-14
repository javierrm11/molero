"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { BLOCK_TYPES } from "@/lib/constants";
import { todayLocal, zonedToUtc } from "@/lib/dates";
import type { BlockTemplate, BlockType, ChecklistItem, ContentStatus, TimeBlock } from "@/lib/types";
import { blockSchema, firstError, formToObject } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

function checklistFor(type: BlockType): ChecklistItem[] {
  return BLOCK_TYPES[type].checklist.map((label) => ({ label, done: false }));
}

function revalidateAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function createBlock(_: FormState, form: FormData): Promise<FormState> {
  const parsed = blockSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const b = parsed.data;
  const { supabase } = await requireUser();
  const { error } = await supabase.from("time_blocks").insert({
    start_at: zonedToUtc(b.date, b.start).toISOString(),
    end_at: zonedToUtc(b.date, b.end).toISOString(),
    type: b.type,
    title: b.title,
    content_id: b.content_id ?? null,
    lead_id: b.lead_id ?? null,
    checklist: checklistFor(b.type as BlockType),
  });
  if (error) return { error: "No se ha podido crear el bloque." };
  revalidateAgenda();
  return { ok: true };
}

export async function updateBlock(id: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = blockSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const b = parsed.data;
  const { supabase } = await requireUser();
  const { data: previous } = await supabase.from("time_blocks").select("type").eq("id", id).single();
  const { error } = await supabase
    .from("time_blocks")
    .update({
      start_at: zonedToUtc(b.date, b.start).toISOString(),
      end_at: zonedToUtc(b.date, b.end).toISOString(),
      type: b.type,
      title: b.title,
      content_id: b.content_id ?? null,
      lead_id: b.lead_id ?? null,
      ...(previous && previous.type !== b.type ? { checklist: checklistFor(b.type as BlockType) } : {}),
    })
    .eq("id", id);
  if (error) return { error: "No se ha podido guardar el bloque." };
  revalidateAgenda();
  redirect(`/foco/${id}`);
}

export async function deleteBlock(id: string, date: string) {
  const { supabase } = await requireUser();
  await supabase.from("time_blocks").delete().eq("id", id);
  revalidateAgenda();
  redirect(`/agenda?d=${date}`);
}

export async function applyTemplate(templateId: string, date: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("block_templates").select("blocks").eq("id", templateId).single();
  const template = data as Pick<BlockTemplate, "blocks"> | null;
  if (!template) return;
  await supabase.from("time_blocks").insert(
    template.blocks.map((b) => ({
      start_at: zonedToUtc(date, b.start).toISOString(),
      end_at: zonedToUtc(date, b.end).toISOString(),
      type: b.type,
      title: b.title,
      checklist: checklistFor(b.type),
    })),
  );
  revalidateAgenda();
}

const planSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z
    .array(
      z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
        type: z.enum(Object.keys(BLOCK_TYPES) as [BlockType, ...BlockType[]]),
        title: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(20),
});

/** Aplica a la agenda los bloques que ha propuesto el asistente. */
export async function applyPlan(input: z.infer<typeof planSchema>): Promise<FormState> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { error: "El plan no es válido." };
  const { supabase } = await requireUser();
  const rows = parsed.data.blocks
    .filter((b) => b.end > b.start)
    .map((b) => ({
      start_at: zonedToUtc(parsed.data.date, b.start).toISOString(),
      end_at: zonedToUtc(parsed.data.date, b.end).toISOString(),
      type: b.type,
      title: b.title,
      checklist: checklistFor(b.type),
    }));
  const { error } = await supabase.from("time_blocks").insert(rows);
  if (error) return { error: "No se ha podido guardar el plan." };
  revalidateAgenda();
  return { ok: true };
}

// ── Modo foco ───────────────────────────────────────────────

export async function startBlock(id: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("time_blocks")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "planned");
  revalidatePath(`/foco/${id}`);
  revalidateAgenda();
}

const NEXT_STATUS: Partial<Record<BlockType, { from: ContentStatus[]; to: ContentStatus }>> = {
  record: { from: ["idea", "script"], to: "recorded" },
  edit: { from: ["idea", "script", "recorded"], to: "edited" },
  upload: { from: ["idea", "script", "recorded", "edited"], to: "published" },
};

export async function finishBlock(id: string, status: "done" | "skipped") {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("time_blocks")
    .update({ status, finished_at: new Date().toISOString() })
    .eq("id", id)
    .select("type, content_id")
    .single();

  // Al terminar un bloque enlazado a un contenido, el contenido avanza en el pipeline.
  const block = data as Pick<TimeBlock, "type" | "content_id"> | null;
  const step = block ? NEXT_STATUS[block.type] : undefined;
  if (status === "done" && block?.content_id && step) {
    await supabase
      .from("contents")
      .update({ status: step.to, ...(step.to === "published" ? { published_at: todayLocal() } : {}) })
      .eq("id", block.content_id)
      .in("status", step.from);
    revalidatePath("/contenido");
  }
  revalidatePath(`/foco/${id}`);
  revalidateAgenda();
}

export async function toggleChecklistItem(id: string, index: number, done: boolean) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("time_blocks").select("checklist").eq("id", id).single();
  const checklist = ((data?.checklist ?? []) as ChecklistItem[]).map((item, i) => (i === index ? { ...item, done } : item));
  await supabase.from("time_blocks").update({ checklist }).eq("id", id);
  revalidatePath(`/foco/${id}`);
}

export async function addChecklistItem(id: string, label: string) {
  const text = label.trim().slice(0, 200);
  if (!text) return;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("time_blocks").select("checklist").eq("id", id).single();
  const checklist = [...((data?.checklist ?? []) as ChecklistItem[]), { label: text, done: false }];
  await supabase.from("time_blocks").update({ checklist }).eq("id", id);
  revalidatePath(`/foco/${id}`);
}
