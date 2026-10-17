"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import type { AnswerSource } from "@/lib/memory";
import { cn } from "@/lib/utils";

import { askQuestion } from "./actions";

interface Turn {
  question: string;
  answer?: string;
  sources?: AnswerSource[];
  error?: string;
}

/** Preguntas a la memoria (toda o una sola fuente) con respuesta y fuentes citadas. */
export function AskMemory({
  sourceId = null,
  placeholder = "Pregunta a tu memoria…",
  fixed = true,
  suggestions = [],
}: {
  sourceId?: string | null;
  placeholder?: string;
  fixed?: boolean;
  suggestions?: string[];
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fixed) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending, fixed]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setTurns((t) => [...t, { question: q }]);
    startTransition(async () => {
      const res = await askQuestion(q, sourceId);
      setTurns((t) =>
        t.map((turn, i) => (i === t.length - 1 ? { ...turn, answer: res.data?.answer, sources: res.data?.sources, error: res.error } : turn)),
      );
    });
  }

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ask(input);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-[28px] bg-card py-1.5 pr-1.5 pl-[18px]",
        fixed &&
          "fixed inset-x-[18px] bottom-[calc(max(env(safe-area-inset-bottom),16px)+76px)] z-20 mx-auto max-w-[444px] shadow-[0_6px_18px_rgba(20,32,27,0.08)]",
      )}
    >
      <label htmlFor={`ask-${sourceId ?? "all"}`} className="sr-only">
        Pregunta
      </label>
      <input
        id={`ask-${sourceId ?? "all"}`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        aria-label="Preguntar"
        disabled={pending || !input.trim()}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50"
      >
        <ArrowUp className="size-[18px]" aria-hidden />
      </button>
    </form>
  );

  return (
    <>
      {!fixed ? form : null}
      {turns.length === 0 && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 text-[13px] font-bold">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="h-[38px] rounded-[19px] bg-card px-3.5">
              {s}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3" aria-live="polite">
        {turns.map((turn, i) => (
          <div key={i} className="flex flex-col gap-3">
            {fixed ? (
              <div className="max-w-[85%] self-end rounded-[20px_20px_6px_20px] bg-ink px-4 py-3 text-[15px] leading-snug text-white">
                {turn.question}
              </div>
            ) : null}
            {turn.error ? (
              <p role="alert" className="rounded-[20px] bg-card p-4 text-sm font-semibold text-danger">
                {turn.error}
              </p>
            ) : turn.answer ? (
              <article className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
                <Markdown text={turn.answer} />
                {turn.sources && turn.sources.length > 0 ? (
                  <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
                    <span className="text-xs font-extrabold text-muted">FUENTES</span>
                    {turn.sources.map((s) => (
                      <Link key={s.n} href={`/memoria/${s.sourceId}`} className="flex items-center gap-2 text-[13px] font-semibold">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-accent-tint text-[11px] font-extrabold text-accent-dark">
                          {s.n}
                        </span>
                        <span className="truncate">
                          {s.title}
                          {s.page ? ` · pág. ${s.page}` : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                <CopyButton text={turn.answer} className="self-start" />
              </article>
            ) : null}
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 px-1 text-sm font-semibold text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Buscando en tu memoria…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      {fixed ? form : null}
    </>
  );
}
