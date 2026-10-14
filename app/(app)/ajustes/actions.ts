"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { BLOCK_TYPE_ORDER } from "@/lib/constants";
import { getSettings } from "@/lib/data";
import type { BlockType } from "@/lib/types";
import { formText } from "@/lib/utils";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function saveFocusSettings(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const settings = await getSettings(supabase);
  const shortcuts: Partial<Record<BlockType, string>> = {};
  for (const type of BLOCK_TYPE_ORDER) {
    const name = formText(form, `shortcut_${type}`);
    if (name) shortcuts[type] = name.slice(0, 100);
  }
  const { error } = await supabase
    .from("settings")
    .update({
      focus_enabled: form.get("focus_enabled") === "on",
      focus_shortcuts: shortcuts,
      focus_off_shortcut: (formText(form, "focus_off_shortcut") ?? "").slice(0, 100),
    })
    .eq("user_id", settings.user_id);
  if (error) return { error: "No se han podido guardar los ajustes." };
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function regenerateToken() {
  const { supabase } = await requireUser();
  const settings = await getSettings(supabase);
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await supabase.from("settings").update({ focus_token: token }).eq("user_id", settings.user_id);
  revalidatePath("/ajustes");
}
