import { NextResponse } from "next/server";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generateJson } from "@/lib/ai/gemini";
import { captureSchema, capturePrompt, type CaptureAi } from "@/lib/ai/prompts";
import { describeCapture } from "@/lib/captures";
import { CAPTURE_TYPES } from "@/lib/constants";
import { formatLongDate, todayLocal } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { CaptureType } from "@/lib/types";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

function normalizeMime(type: string): string {
  const base = type.split(";")[0]?.trim() || "audio/webm";
  return base === "audio/x-m4a" ? "audio/mp4" : base;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sesión caducada" }, { status: 401 });

  const form = await request.formData();
  const text = typeof form.get("text") === "string" ? String(form.get("text")).trim().slice(0, 5000) : "";
  const hintRaw = form.get("type");
  const hint = typeof hintRaw === "string" && hintRaw in CAPTURE_TYPES ? (hintRaw as CaptureType) : undefined;
  const audio = form.get("audio");
  const audioFile = audio instanceof File && audio.size > 0 ? audio : null;

  if (!text && !audioFile) return NextResponse.json({ error: "La captura está vacía" }, { status: 400 });
  if (audioFile && audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "El audio es demasiado largo" }, { status: 413 });
  }

  let audioPath: string | null = null;
  let base64: string | null = null;
  const mimeType = audioFile ? normalizeMime(audioFile.type) : "";
  if (audioFile) {
    const bytes = Buffer.from(await audioFile.arrayBuffer());
    base64 = bytes.toString("base64");
    const ext = mimeType.includes("mp4") ? "m4a" : (mimeType.split("/")[1] ?? "webm");
    audioPath = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("captures").upload(audioPath, bytes, { contentType: mimeType });
    if (error) {
      console.error("[captura] no se pudo subir el audio", error);
      audioPath = null;
    }
  }

  let ai: CaptureAi | null = null;
  let aiError: string | null = null;
  try {
    const prompt =
      capturePrompt(formatLongDate(todayLocal()) + ` (${todayLocal()})`, text || undefined, !!base64) +
      (hint ? `\nJavier la ha marcado como tipo: ${hint}.` : "");
    ai = await generateJson({
      task: "capture",
      system: await buildContext("capture"),
      prompt,
      attachments: base64 ? [{ mimeType, base64 }] : undefined,
      schema: captureSchema,
    });
  } catch (error) {
    aiError = aiErrorMessage(error);
  }

  const type: CaptureType = hint ?? ai?.type ?? "idea";
  const rawText = ai?.transcript || text || null;
  const title = ai?.title || (rawText ? rawText.slice(0, 80) : "Nota de voz");

  const { data, error } = await supabase
    .from("captures")
    .insert({ type, title, raw_text: rawText, audio_url: audioPath, ai: ai ?? {} })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[captura] error al guardar", error);
    return NextResponse.json({ error: "No se ha podido guardar la captura" }, { status: 500 });
  }

  const summary = describeCapture(ai);
  if (aiError) summary.push(`${aiError} La he guardado sin procesar.`);

  return NextResponse.json({ capture: { id: data.id, type, title, summary } });
}
