"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";

import { generateSummary } from "./actions";

export function SummaryStep({
  week,
  initialSummary,
  initialWins,
  initialLosses,
}: {
  week: string;
  initialSummary: string | null;
  initialWins: string;
  initialLosses: string;
}) {
  const [wins, setWins] = useState(initialWins);
  const [losses, setLosses] = useState(initialLosses);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <section className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <Field label="Qué ha funcionado (opcional)" htmlFor="wins">
          <Textarea id="wins" rows={2} value={wins} onChange={(e) => setWins(e.target.value)} />
        </Field>
        <Field label="Qué no ha funcionado (opcional)" htmlFor="losses">
          <Textarea id="losses" rows={2} value={losses} onChange={(e) => setLosses(e.target.value)} />
        </Field>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await generateSummary(week, wins, losses);
              if (res.error) setError(res.error);
              else setSummary(res.data ?? null);
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {summary ? "Regenerar resumen" : "Generar resumen con IA"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </section>
      {summary ? (
        <section className="flex flex-col gap-2 rounded-[26px] bg-card p-[18px]">
          <span className="text-xs font-extrabold text-accent">RESUMEN DE GEMINI</span>
          <Markdown text={summary} />
        </section>
      ) : null}
    </>
  );
}
