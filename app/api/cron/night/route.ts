import { NextResponse } from "next/server";

import { appUrl, isCronAuthorized } from "@/lib/app-url";
import { buildCoachReport, dayStats } from "@/lib/coach";
import { todayLocal, weekStart, weekdayLetter } from "@/lib/dates";
import { sendTelegram, tgEscape } from "@/lib/integrations/telegram";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Settings } from "@/lib/types";

// Cron de la noche: recuerda la revisión del día por Telegram y, los domingos, prepara el informe semanal.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const client = createAdminClient();
  const { data } = await client.from("settings").select("*").eq("night_checkin", true);
  const date = todayLocal();
  const sunday = weekdayLetter(date) === "D";
  const base = await appUrl();
  const results = [];

  for (const settings of (data ?? []) as Settings[]) {
    const scope = { client, userId: settings.user_id };
    try {
      const stats = await dayStats(scope, date);
      let extra = "";
      if (sunday) {
        const report = await buildCoachReport(scope, weekStart(date));
        extra = report.one_change ? `\n\n<b>Para la semana que viene:</b> ${tgEscape(report.one_change)}` : "";
      }
      if (settings.telegram_chat_id) {
        const summary = stats.total > 0 ? `Has hecho ${stats.done} de ${stats.total} bloques.` : "Hoy no había bloques en la agenda.";
        await sendTelegram(settings.telegram_chat_id, `<b>¿Cómo ha ido hoy?</b>\n${summary} Son 2 minutos.${extra}`, {
          text: sunday ? "Revisar el día y la semana" : "Revisar el día",
          url: `${base}/noche`,
        });
      }
      results.push({ user: settings.user_id, ok: true });
    } catch (error) {
      console.error("[cron:night]", error);
      results.push({ user: settings.user_id, ok: false });
    }
  }
  return NextResponse.json({ date, results });
}
