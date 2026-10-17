"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { aiErrorMessage } from "@/lib/ai/gemini";
import { sessionScope } from "@/lib/auth";
import { askMemory, ingestSource, type AnswerSource } from "@/lib/memory";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import type { MemorySource } from "@/lib/types";

export async function askQuestion(
  question: string,
  sourceId: string | null,
): Promise<{ data?: { answer: string; sources: AnswerSource[] }; error?: string }> {
  const text = question.trim().slice(0, 2000);
  if (!text) return { error: "Escribe una pregunta." };
  try {
    return { data: await askMemory(await sessionScope(), text, sourceId) };
  } catch (error) {
    console.error("[memoria] pregunta", error);
    return { error: aiErrorMessage(error) };
  }
}

export async function updateSourceNote(id: string, _: unknown, form: FormData): Promise<{ ok?: boolean; error?: string }> {
  const note = String(form.get("note") ?? "").trim().slice(0, 10000);
  const { client } = await sessionScope();
  const { error } = await client.from("memory_sources").update({ user_note: note || null }).eq("id", id);
  if (error) return { error: "No se ha podido guardar." };
  revalidatePath(`/memoria/${id}`);
  return { ok: true };
}

export async function toggleLibrary(id: string, inLibrary: boolean) {
  const { client } = await sessionScope();
  await client.from("memory_sources").update({ in_library: inLibrary }).eq("id", id);
  revalidatePath(`/memoria/${id}`);
  revalidatePath("/biblioteca");
}

export async function reprocessSource(id: string) {
  const scope = await sessionScope();
  if (hasAdminKey()) {
    const admin = createAdminClient();
    after(() => ingestSource({ client: admin, userId: scope.userId }, id));
    await scope.client.from("memory_sources").update({ status: "pending", error: null }).eq("id", id);
  } else {
    await ingestSource(scope, id);
  }
  revalidatePath(`/memoria/${id}`);
}

export async function deleteSource(id: string, back: string) {
  const { client } = await sessionScope();
  const { data } = await client.from("memory_sources").select("file_path").eq("id", id).single();
  const source = data as Pick<MemorySource, "file_path"> | null;
  if (source?.file_path) await client.storage.from("memory").remove([source.file_path]);
  await client.from("memory_sources").delete().eq("id", id);
  revalidatePath("/memoria");
  revalidatePath("/biblioteca");
  redirect(back);
}
