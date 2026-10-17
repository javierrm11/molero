"use client";

import { Loader2, Mic, Plus, Square, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { CAPTURE_TYPES } from "@/lib/constants";
import type { CaptureType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CaptureResult {
  id: string;
  type: CaptureType;
  title: string;
  summary: string[];
}

const MAX_SECONDS = 120;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"].find((t) => MediaRecorder.isTypeSupported(t));
}

export function CaptureSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Atajo del icono de la PWA: /?captura=1 abre la hoja directamente.
  const [open, setOpen] = useState(() => searchParams.get("captura") === "1");
  const [text, setText] = useState("");
  const [hint, setHint] = useState<CaptureType | "auto">("auto");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stopTimer(), []);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function reset() {
    setText("");
    setHint("auto");
    setAudio(null);
    setSeconds(0);
    setError(null);
    setResult(null);
  }

  function close() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setOpen(false);
    reset();
    if (searchParams.get("captura")) router.replace(pathname);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        setRecording(false);
        setAudio(new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setAudio(null);
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) recorder.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("No puedo acceder al micrófono. Revisa los permisos del navegador.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function submit() {
    if (!text.trim() && !audio) {
      setError("Escribe algo o graba una nota de voz.");
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData();
    if (text.trim()) form.set("text", text.trim());
    if (hint !== "auto") form.set("type", hint);
    if (audio) form.set("audio", audio, `captura.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
    try {
      const res = await fetch("/api/ai/capture", { method: "POST", body: form });
      const json = (await res.json()) as { capture?: CaptureResult; error?: string };
      if (!res.ok || !json.capture) throw new Error(json.error ?? "No se ha podido guardar la captura.");
      setResult(json.capture);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar la captura.");
    } finally {
      setPending(false);
    }
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      {pathname.startsWith("/asistente") || pathname === "/memoria/preguntar" ? null : (
      <button
        type="button"
        aria-label="Captura rápida"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-[calc(max(env(safe-area-inset-bottom),16px)+80px)] z-30 flex size-14 items-center justify-center rounded-[20px] bg-ink text-white shadow-[0_8px_20px_rgba(20,32,27,0.25)]"
      >
        <Plus className="size-6" strokeWidth={2.2} aria-hidden />
      </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="captura-title">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-ink/45" onClick={close} />
          <div className="safe-bottom relative flex max-h-[92dvh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-[32px] bg-card px-5 pt-3">
            <span aria-hidden className="mx-auto h-[5px] w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between">
              <h2 id="captura-title" className="text-[22px] font-extrabold tracking-[-0.4px]">
                Captura rápida
              </h2>
              <Button variant="soft" size="icon" aria-label="Cerrar" onClick={close}>
                <X className="size-[18px]" aria-hidden />
              </Button>
            </div>

            {result ? (
              <div className="flex flex-col gap-4 pb-2">
                <div className="flex flex-col gap-2 rounded-[20px] bg-accent-tint p-4">
                  <Badge tone={CAPTURE_TYPES[result.type].tone} className="self-start bg-card">
                    {CAPTURE_TYPES[result.type].label}
                  </Badge>
                  <p className="text-lg font-extrabold leading-snug">{result.title}</p>
                  {result.summary.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-sm text-accent-dark">
                      {result.summary.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <p className="text-sm text-muted">Guardada en la bandeja. La procesas en la revisión semanal o ahora mismo.</p>
                <div className="flex gap-2.5">
                  <Button variant="soft" className="flex-1" onClick={reset}>
                    Otra
                  </Button>
                  <Link
                    href="/bandeja"
                    onClick={close}
                    className="flex h-12 flex-[2] items-center justify-center rounded-[16px] bg-accent text-sm font-bold text-white"
                  >
                    Abrir bandeja
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-5 gap-1 rounded-[16px] bg-bg p-1 text-[13px] font-bold">
                  {(["auto", "idea", "lead", "task", "context"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={hint === t}
                      onClick={() => setHint(t)}
                      className={cn("h-10 rounded-[12px]", hint === t ? "bg-card text-ink shadow-sm" : "text-muted")}
                    >
                      {t === "auto" ? "Auto" : CAPTURE_TYPES[t].label}
                    </button>
                  ))}
                </div>

                <label htmlFor="captura-texto" className="sr-only">
                  Texto de la captura
                </label>
                <Textarea
                  id="captura-texto"
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Idea, lead, tarea o cambio de contexto…"
                  className="border-2 text-base focus:border-accent"
                />

                <div className="flex items-center gap-3 rounded-[20px] bg-bg p-3">
                  {recording ? (
                    <Button size="icon" variant="dark" aria-label="Parar grabación" onClick={stopRecording} className="size-14 rounded-full">
                      <Square className="size-5 fill-current" aria-hidden />
                    </Button>
                  ) : (
                    <Button size="icon" aria-label="Grabar nota de voz" onClick={startRecording} className="size-14 rounded-full">
                      <Mic className="size-6" aria-hidden />
                    </Button>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[15px] font-bold">
                      {recording ? `Grabando · ${mmss}` : audio ? `Nota de voz lista · ${mmss}` : "Nota de voz"}
                    </span>
                    <span className="text-[13px] text-muted">
                      {recording ? "Pulsa para parar" : "Gemini transcribe y ordena la captura"}
                    </span>
                  </div>
                  {audio && !recording ? (
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAudio(null)}>
                      Quitar
                    </Button>
                  ) : null}
                </div>

                {error ? (
                  <p role="alert" className="text-sm font-semibold text-danger">
                    {error}
                  </p>
                ) : null}

                <Button size="lg" onClick={submit} disabled={pending || recording} className="mb-2">
                  {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
                  {pending ? "Gemini lo está ordenando…" : "Guardar en la bandeja"}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
