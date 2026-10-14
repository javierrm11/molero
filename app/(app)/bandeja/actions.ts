"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CaptureAi } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { BLOCK_TYPES } from "@/lib/constants";
import { zonedToUtc } from "@/lib/dates";
import type { BlockType, Capture } from "@/lib/types";
import { blockSchema, contentSchema, firstError, formToObject, leadSchema } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

async function loadCapture(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("captures").select("*").eq("id", id).single();
  return { supabase, capture: data as Capture & { ai: Partial<CaptureAi> } };
}

async function markProcessed(id: string, ref: string | null) {
  const { supabase } = await requireUser();
  await supabase.from("captures").update({ processed: true, result_ref: ref }).eq("id", id);
  revalidatePath("/bandeja");
  revalidatePath("/");
}

export async function captureToContent(id: string) {
  const { supabase, capture } = await loadCapture(id);
  const idea = capture.ai.idea;
  const parsed = contentSchema.safeParse({
    title: capture.title ?? capture.raw_text?.slice(0, 120) ?? "Idea",
    pillar: idea?.pillar ?? "",
    format: idea?.format ?? "",
    platforms: idea?.platforms ?? [],
    hook: idea?.hook ?? "",
    script: capture.raw_text ?? "",
    status: "idea",
  });
  if (!parsed.success) return;
  const { data } = await supabase.from("contents").insert(parsed.data).select("id").single();
  await markProcessed(id, data ? `contents:${data.id}` : null);
  revalidatePath("/contenido");
}

export async function captureToLead(id: string) {
  const { supabase, capture } = await loadCapture(id);
  const lead = capture.ai.lead;
  const parsed = leadSchema.safeParse({
    name: lead?.name || capture.title || "Lead sin nombre",
    company: lead?.company ?? "",
    sector: lead?.sector ?? "",
    city: lead?.city ?? "",
    source: lead?.source ?? "",
    service_interest: lead?.service_interest ?? "",
    next_step: lead?.next_step ?? "",
    follow_up_at: lead?.follow_up_at && /^\d{4}-\d{2}-\d{2}$/.test(lead.follow_up_at) ? lead.follow_up_at : "",
    notes: capture.raw_text ?? "",
    status: "new",
  });
  if (!parsed.success) return;
  const { data } = await supabase.from("leads").insert(parsed.data).select("id").single();
  await markProcessed(id, data ? `leads:${data.id}` : null);
  revalidatePath("/crm");
  if (data) redirect(`/crm/${data.id}`);
}

export async function captureToBlock(id: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = blockSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const b = parsed.data;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("time_blocks")
    .insert({
      start_at: zonedToUtc(b.date, b.start).toISOString(),
      end_at: zonedToUtc(b.date, b.end).toISOString(),
      type: b.type,
      title: b.title,
      checklist: BLOCK_TYPES[b.type as BlockType].checklist.map((label) => ({ label, done: false })),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "No se ha podido crear el bloque." };
  await markProcessed(id, `time_blocks:${data.id}`);
  revalidatePath("/agenda");
  return { ok: true };
}

export async function discardCapture(id: string) {
  await markProcessed(id, null);
}

export async function deleteCapture(id: string) {
  const { supabase, capture } = await loadCapture(id);
  if (capture.audio_url) await supabase.storage.from("captures").remove([capture.audio_url]);
  await supabase.from("captures").delete().eq("id", id);
  revalidatePath("/bandeja");
  revalidatePath("/");
}
