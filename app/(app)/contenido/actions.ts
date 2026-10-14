"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generateJson } from "@/lib/ai/gemini";
import {
  adaptPrompt,
  adaptSchema,
  hooksPrompt,
  hooksSchema,
  scriptPrompt,
  scriptSchema,
  topicsPrompt,
  topicsSchema,
  type ContentBrief,
} from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { FORMATS, PILLARS, PLATFORMS } from "@/lib/constants";
import { todayLocal } from "@/lib/dates";
import type { Content, ContentFormat, ContentStatus, Pillar, Platform } from "@/lib/types";
import { contentSchema, firstError, formToObject } from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

function revalidateContent(id?: string) {
  revalidatePath("/contenido");
  revalidatePath("/");
  if (id) revalidatePath(`/contenido/${id}`);
}

export async function createContent(_: FormState, form: FormData): Promise<FormState> {
  const parsed = contentSchema.safeParse(formToObject(form, ["platforms"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("contents").insert(parsed.data).select("id").single();
  if (error || !data) return { error: "No se ha podido crear el contenido." };
  revalidateContent();
  redirect(`/contenido/${data.id}`);
}

export async function updateContent(id: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = contentSchema.safeParse(formToObject(form, ["platforms"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = { ...parsed.data };
  if (data.status === "published" && !data.published_at) data.published_at = todayLocal();
  const { supabase } = await requireUser();
  const { error } = await supabase.from("contents").update(data).eq("id", id);
  if (error) return { error: "No se ha podido guardar." };
  revalidateContent(id);
  return { ok: true };
}

export async function setContentStatus(id: string, status: ContentStatus) {
  const { supabase } = await requireUser();
  await supabase
    .from("contents")
    .update({ status, ...(status === "published" ? { published_at: todayLocal() } : {}) })
    .eq("id", id);
  revalidateContent(id);
}

export async function deleteContent(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("contents").delete().eq("id", id);
  revalidateContent();
  redirect("/contenido");
}

// ── IA ──────────────────────────────────────────────────────

async function loadBrief(id: string): Promise<ContentBrief> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("contents").select("*").eq("id", id).single();
  const c = data as Content;
  return {
    title: c.title,
    pillar: c.pillar ? PILLARS[c.pillar].label : null,
    format: c.format ? FORMATS[c.format] : null,
    platforms: c.platforms.map((p) => PLATFORMS[p]),
    hook: c.hook,
    script: c.script,
    cta: c.cta,
  };
}

export type AiResult<T> = { data?: T; error?: string };

export async function generateScript(id: string): Promise<AiResult<{ hook: string; script: string; cta: string }>> {
  try {
    const brief = await loadBrief(id);
    const result = await generateJson({
      task: "script",
      tier: "pro",
      system: await buildContext("script"),
      prompt: scriptPrompt(brief),
      schema: scriptSchema,
    });
    const { supabase } = await requireUser();
    await supabase.from("contents").update({ hook: result.hook, script: result.script, cta: result.cta }).eq("id", id);
    await supabase.from("contents").update({ status: "script" }).eq("id", id).eq("status", "idea");
    revalidateContent(id);
    return { data: result };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function generateHooks(id: string): Promise<AiResult<string[]>> {
  try {
    const brief = await loadBrief(id);
    const result = await generateJson({
      task: "hooks",
      system: await buildContext("hooks"),
      prompt: hooksPrompt(brief),
      schema: hooksSchema,
    });
    return { data: result.hooks };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function applyHook(id: string, hook: string) {
  const { supabase } = await requireUser();
  await supabase.from("contents").update({ hook: hook.slice(0, 500) }).eq("id", id);
  revalidateContent(id);
}

export async function adaptContent(id: string, platform: Platform): Promise<AiResult<string>> {
  if (!(platform in PLATFORMS)) return { error: "Red no válida" };
  try {
    const brief = await loadBrief(id);
    const result = await generateJson({
      task: "adapt",
      system: await buildContext("adapt"),
      prompt: adaptPrompt(brief, PLATFORMS[platform]),
      schema: adaptSchema,
    });
    return { data: result.text };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export interface TopicIdea {
  title: string;
  pillar: Pillar;
  format: ContentFormat;
  platforms: Platform[];
  hook: string;
  why: string;
}

export async function suggestTopics(): Promise<AiResult<TopicIdea[]>> {
  try {
    const result = await generateJson({
      task: "topics",
      system: await buildContext("topics"),
      prompt: topicsPrompt(),
      schema: topicsSchema,
    });
    return { data: result.ideas };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function addIdea(idea: TopicIdea) {
  const parsed = contentSchema.safeParse({ ...idea, status: "idea" });
  if (!parsed.success) return;
  const { supabase } = await requireUser();
  await supabase.from("contents").insert(parsed.data);
  revalidateContent();
}
