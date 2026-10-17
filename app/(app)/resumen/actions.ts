"use server";

import { revalidatePath } from "next/cache";

import { aiErrorMessage } from "@/lib/ai/gemini";
import { sessionScope } from "@/lib/auth";
import { buildBriefing } from "@/lib/briefing";
import { todayLocal } from "@/lib/dates";
import { completeTask, getAccessToken, getGoogleAccount } from "@/lib/integrations/google";

export async function generateBriefingNow(): Promise<{ error?: string }> {
  try {
    await buildBriefing(await sessionScope(), todayLocal());
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
  revalidatePath("/resumen");
  revalidatePath("/");
  return {};
}

export async function completeGoogleTask(taskId: string): Promise<{ error?: string }> {
  const { client, userId } = await sessionScope();
  const account = await getGoogleAccount(client, userId);
  if (!account) return { error: "Google no está conectado." };
  try {
    await completeTask(await getAccessToken(client, account), taskId);
  } catch {
    return { error: "No se ha podido marcar la tarea." };
  }
  revalidatePath("/");
  return {};
}
