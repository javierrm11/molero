import { NextResponse } from "next/server";

import { sendTelegram } from "@/lib/integrations/telegram";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook del bot: /start <código> vincula el chat; cualquier otro texto se guarda en la bandeja.
export const dynamic = "force-dynamic";

interface Update {
  message?: { chat: { id: number }; text?: string };
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await request.json()) as Update;
  const chatId = update.message?.chat.id;
  const text = update.message?.text?.trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const client = createAdminClient();
  const start = /^\/start\s+(\w+)/.exec(text);
  if (start) {
    const { data } = await client
      .from("settings")
      .update({ telegram_chat_id: String(chatId) })
      .eq("telegram_link_code", start[1])
      .select("user_id")
      .maybeSingle();
    await sendTelegram(
      String(chatId),
      data
        ? "Conectado con Molero HQ. Te mandaré el resumen cada mañana y la revisión cada noche. Lo que me escribas irá a tu bandeja."
        : "Ese código no es válido. Usa el enlace de Ajustes.",
    );
    return NextResponse.json({ ok: true });
  }

  const { data: settings } = await client.from("settings").select("user_id").eq("telegram_chat_id", String(chatId)).maybeSingle();
  if (!settings) {
    await sendTelegram(String(chatId), "Este chat no está vinculado. Ábrelo desde Ajustes en Molero HQ.");
    return NextResponse.json({ ok: true });
  }
  await client.from("captures").insert({
    user_id: settings.user_id,
    type: "idea",
    title: text.slice(0, 80),
    raw_text: text.slice(0, 5000),
  });
  await sendTelegram(String(chatId), "Guardado en la bandeja.");
  return NextResponse.json({ ok: true });
}
