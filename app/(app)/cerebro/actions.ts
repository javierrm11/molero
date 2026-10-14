"use server";

import { revalidatePath } from "next/cache";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generateJson } from "@/lib/ai/gemini";
import { contextUpdatePrompt, contextUpdateSchema, type ContextUpdate } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { BRAND_SECTIONS } from "@/lib/constants";
import type { BrandSection } from "@/lib/types";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function saveSection(section: BrandSection, _: FormState, form: FormData): Promise<FormState> {
  if (!(section in BRAND_SECTIONS)) return { error: "Sección no válida" };
  const content = String(form.get("content") ?? "").slice(0, 20000);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("brand_context").upsert({ section, content }, { onConflict: "user_id,section" });
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath("/cerebro");
  return { ok: true };
}

export async function proposeContextUpdate(note: string): Promise<{ data?: ContextUpdate; error?: string }> {
  const text = note.trim().slice(0, 4000);
  if (!text) return { error: "Pega primero la información nueva." };
  try {
    const result = await generateJson({
      task: "context_update",
      system: await buildContext("context_update"),
      prompt: contextUpdatePrompt(text),
      schema: contextUpdateSchema,
    });
    return { data: result };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function applyContextUpdate(section: string, content: string, captureId: string | null): Promise<FormState> {
  if (!(section in BRAND_SECTIONS)) return { error: "Sección no válida" };
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("brand_context")
    .upsert({ section, content: content.slice(0, 20000) }, { onConflict: "user_id,section" });
  if (error) return { error: "No se ha podido guardar." };
  if (captureId) {
    await supabase.from("captures").update({ processed: true, result_ref: `brand_context:${section}` }).eq("id", captureId);
    revalidatePath("/bandeja");
  }
  revalidatePath("/cerebro");
  return { ok: true };
}
