import { NextResponse, type NextRequest } from "next/server";

import { BLOCK_TYPES } from "@/lib/constants";
import { formatTime } from "@/lib/dates";
import { focusShortcutName } from "@/lib/focus";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Settings, TimeBlock } from "@/lib/types";

// Endpoint para los Atajos de iOS (automatizaciones "Al abrir una app"). No hay sesión: se identifica
// con el token personal de /ajustes. Devuelve qué toca ahora para poder bloquear distracciones.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? request.headers.get("x-molero-token");
  if (!token || token.length < 32) return NextResponse.json({ error: "Falta el token" }, { status: 401 });

  const admin = createAdminClient();
  const { data: settings } = await admin.from("settings").select("*").eq("focus_token", token).maybeSingle();
  if (!settings) return NextResponse.json({ error: "Token no válido" }, { status: 401 });
  const s = settings as Settings;

  const now = new Date().toISOString();
  const [{ data: current }, { data: next }] = await Promise.all([
    admin
      .from("time_blocks")
      .select("*")
      .eq("user_id", s.user_id)
      .lte("start_at", now)
      .gt("end_at", now)
      .in("status", ["planned", "active"])
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("time_blocks")
      .select("start_at, type, title")
      .eq("user_id", s.user_id)
      .gt("start_at", now)
      .eq("status", "planned")
      .order("start_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const block = current as TimeBlock | null;
  const upcoming = next as Pick<TimeBlock, "start_at" | "type" | "title"> | null;
  const origin = request.nextUrl.origin;

  const body = block
    ? {
        active: true,
        focus: block.type !== "rest",
        type: block.type,
        label: BLOCK_TYPES[block.type].label,
        title: block.title,
        start: formatTime(block.start_at),
        end: formatTime(block.end_at),
        minutes_left: Math.max(0, Math.round((new Date(block.end_at).getTime() - Date.now()) / 60000)),
        shortcut: focusShortcutName(s, block.type),
        url: `${origin}/foco/${block.id}`,
        message:
          block.type === "rest"
            ? `Descanso hasta las ${formatTime(block.end_at)}.`
            : `Ahora toca ${BLOCK_TYPES[block.type].label.toLowerCase()}: ${block.title}. Quedan ${Math.max(
                0,
                Math.round((new Date(block.end_at).getTime() - Date.now()) / 60000),
              )} min.`,
      }
    : {
        active: false,
        focus: false,
        message: upcoming
          ? `Ahora no hay bloque. Siguiente: ${BLOCK_TYPES[upcoming.type].label} · ${upcoming.title} a las ${formatTime(upcoming.start_at)}.`
          : "Ahora no hay ningún bloque en la agenda.",
        url: `${origin}/agenda`,
      };

  if (request.nextUrl.searchParams.get("format") === "text") {
    return new NextResponse(body.message, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
