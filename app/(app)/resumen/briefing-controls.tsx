"use client";

import { Loader2, Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { generateBriefingNow } from "./actions";

/** Lee el resumen en voz alta con la síntesis de voz del navegador (gratis, sin IA). */
export function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return (
    <Button
      size="icon"
      aria-label={speaking ? "Parar" : "Escuchar el resumen"}
      onClick={() => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        if (speaking) {
          synth.cancel();
          setSpeaking(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.onend = () => setSpeaking(false);
        synth.speak(utterance);
        setSpeaking(true);
      }}
    >
      {speaking ? <Pause className="size-[18px]" aria-hidden /> : <Play className="size-[18px] fill-current" aria-hidden />}
    </Button>
  );
}

export function GenerateButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "white" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await generateBriefingNow();
            if (res.error) setError(res.error);
          })
        }
      >
        {pending ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <RefreshCw className="size-[18px]" aria-hidden />}
        {pending ? "Preparando tu resumen…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
