import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/app-url";
import { buildBriefing, sendBriefing } from "@/lib/briefing";
import { todayLocal } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Settings } from "@/lib/types";

// Cron de la mañana (vercel.json o n8n): genera el resumen del día y lo manda por Telegram.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const client = createAdminClient();
  const { data } = await client.from("settings").select("*").eq("morning_brief", true);
  const date = todayLocal();
  const results = [];
  for (const settings of (data ?? []) as Settings[]) {
    const scope = { client, userId: settings.user_id };
    try {
      const briefing = await buildBriefing(scope, date);
      if (settings.telegram_chat_id) await sendBriefing(scope, briefing, settings.telegram_chat_id);
      results.push({ user: settings.user_id, ok: true, sent: !!settings.telegram_chat_id });
    } catch (error) {
      console.error("[cron:morning]", error);
      results.push({ user: settings.user_id, ok: false });
    }
  }
  return NextResponse.json({ date, results });
}
