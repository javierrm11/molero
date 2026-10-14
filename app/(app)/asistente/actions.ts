"use server";

import { z } from "zod";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generate, generateJson, type ChatTurn } from "@/lib/ai/gemini";
import { planDayPrompt, planDaySchema, type PlanDay } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";

const historySchema = z
  .array(z.object({ role: z.enum(["user", "model"]), text: z.string().max(8000) }))
  .max(30);

export async function sendChat(history: ChatTurn[], message: string): Promise<{ data?: string; error?: string }> {
  await requireUser();
  const parsed = historySchema.safeParse(history);
  const text = message.trim().slice(0, 4000);
  if (!parsed.success || !text) return { error: "Mensaje no válido." };
  try {
    const reply = await generate({
      task: "chat",
      system: await buildContext("chat"),
      history: parsed.data.slice(-12),
      prompt: text,
    });
    return { data: reply };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

export async function planDay(date: string, request: string): Promise<{ data?: PlanDay; error?: string }> {
  await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  try {
    const plan = await generateJson({
      task: "plan_day",
      tier: "pro",
      system: await buildContext("plan_day", { date }),
      prompt: planDayPrompt(date, request.slice(0, 2000)),
      schema: planDaySchema,
    });
    return { data: plan };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}
