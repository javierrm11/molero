import { NextResponse, type NextRequest } from "next/server";

import { createSource, sourceFromUrl } from "@/lib/memory-create";
import { createAdminClient } from "@/lib/supabase/admin";

// Atajo de iOS «Guardar en Molero» (menú Compartir): POST con el enlace y el token personal de Ajustes.
// Acepta JSON {url, note} o texto plano con el enlace.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? request.headers.get("x-molero-token");
  if (!token || token.length < 32) return new NextResponse("Falta el token", { status: 401 });

  const client = createAdminClient();
  const { data: settings } = await client.from("settings").select("user_id").eq("focus_token", token).maybeSingle();
  if (!settings) return new NextResponse("Token no válido", { status: 401 });

  let url = "";
  let note: string | null = null;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json()) as { url?: string; note?: string };
    url = body.url?.trim() ?? "";
    note = body.note?.trim() || null;
  } else {
    const text = (await request.text()).trim();
    url = /https?:\/\/\S+/.exec(text)?.[0] ?? "";
    note = text.replace(url, "").trim() || null;
  }

  const input = sourceFromUrl(url, note, true);
  if (!input) return new NextResponse("No he encontrado un enlace válido", { status: 400 });
  await createSource(client, settings.user_id, input);
  return new NextResponse("Guardado en tu biblioteca. Lo resumo en un momento.", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
