"use client";

import { ArrowUp, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { applyPlan } from "@/app/(app)/agenda/actions";
import type { PlanDay } from "@/lib/ai/prompts";
import { BLOCK_TYPES, TONES } from "@/lib/constants";
import { addDays, formatLongDate } from "@/lib/dates";
import type { BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";

import { planDay, sendChat } from "./actions";

interface Message {
  role: "user" | "model";
  text: string;
  plan?: { date: string; data: PlanDay; applied?: boolean };
  error?: boolean;
}

const QUICK = [
  { label: "Organízame hoy", kind: "plan_today" },
  { label: "Organízame mañana", kind: "plan_tomorrow" },
  { label: "Post de LinkedIn", kind: "chat", prompt: "Escríbeme un post de LinkedIn sobre el último proyecto que he construido." },
  { label: "Ideas para la semana", kind: "chat", prompt: "Dame ideas de contenido para esta semana, una por pilar, sin repetir temas." },
  { label: "Mensaje de seguimiento", kind: "chat", prompt: "Redáctame un mensaje de seguimiento para el lead más urgente." },
  { label: "Resume mi mes", kind: "chat", prompt: "Resume cómo va mi mes: contenido, ventas y qué ajustar." },
] as const;

const PLAN_PATTERN = /organ[ií]z|planifi|time ?block|agenda de/i;

export function Assistant({ today, autoPlanDate }: { today: string; autoPlanDate: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const autoRan = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function runPlan(date: string, request: string) {
    setMessages((m) => [...m, { role: "user", text: request }]);
    startTransition(async () => {
      const res = await planDay(date, request);
      setMessages((m) => [
        ...m,
        res.data
          ? { role: "model", text: res.data.summary, plan: { date, data: res.data } }
          : { role: "model", text: res.error ?? "No he podido planificar el día.", error: true },
      ]);
    });
  }

  function runChat(text: string) {
    const history = messages.filter((m) => !m.error).map(({ role, text: t }) => ({ role, text: t }));
    setMessages((m) => [...m, { role: "user", text }]);
    startTransition(async () => {
      const res = await sendChat(history, text);
      setMessages((m) => [...m, res.data ? { role: "model", text: res.data } : { role: "model", text: res.error ?? "Error", error: true }]);
    });
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || pending) return;
    setInput("");
    if (PLAN_PATTERN.test(clean)) {
      const date = /mañana/i.test(clean) ? addDays(today, 1) : today;
      runPlan(date, clean);
    } else {
      runChat(clean);
    }
  }

  useEffect(() => {
    if (autoPlanDate && !autoRan.current) {
      autoRan.current = true;
      runPlan(autoPlanDate, `Organízame el ${formatLongDate(autoPlanDate)}.`);
    }
  }, [autoPlanDate]);

  function apply(index: number) {
    const message = messages[index];
    if (!message?.plan) return;
    const { date, data } = message.plan;
    startTransition(async () => {
      const res = await applyPlan({ date, blocks: data.blocks as { start: string; end: string; type: BlockType; title: string }[] });
      if (res?.ok) {
        setMessages((m) => m.map((msg, i) => (i === index && msg.plan ? { ...msg, plan: { ...msg.plan, applied: true } } : msg)));
      } else {
        setMessages((m) => [...m, { role: "model", text: res?.error ?? "No se ha podido aplicar el plan.", error: true }]);
      }
    });
  }

  return (
    <>
      <div className="scrollbar-none -mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] text-[13px] font-bold">
        {QUICK.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={pending}
            onClick={() => {
              if (q.kind === "plan_today") runPlan(today, "Organízame hoy.");
              else if (q.kind === "plan_tomorrow") runPlan(addDays(today, 1), "Organízame mañana.");
              else runChat(q.prompt);
            }}
            className="h-[38px] shrink-0 rounded-[19px] bg-card px-3.5 disabled:opacity-60"
          >
            {q.label}
          </button>
        ))}
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-[26px] bg-card p-[18px]">
          <p className="text-[15px] font-extrabold">¿En qué te ayudo?</p>
          <p className="text-sm text-muted">
            Conozco tu Cerebro, tu pipeline, tus leads y tu agenda. Pídeme que te organice el día, un guion, un post o un mensaje.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3" aria-live="polite">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="max-w-[85%] self-end rounded-[20px_20px_6px_20px] bg-ink px-4 py-3 text-[15px] leading-snug text-white">
              {m.text}
            </div>
          ) : (
            <article key={i} className={cn("flex flex-col gap-3 rounded-[26px] bg-card p-[18px]", m.error && "text-danger")}>
              {m.plan ? (
                <>
                  <p className="text-xs font-extrabold text-muted first-letter:uppercase">{formatLongDate(m.plan.date)}</p>
                  <p className="text-[15px] leading-relaxed">{m.text}</p>
                  <ol className="flex flex-col gap-1.5">
                    {m.plan.data.blocks.map((b, j) => {
                      const meta = BLOCK_TYPES[b.type as BlockType];
                      const tone = TONES[meta?.tone ?? "grey"];
                      return (
                        <li key={j} className={cn("flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm", tone.bg, tone.text)}>
                          <span className="w-[92px] shrink-0 font-bold">
                            {b.start}–{b.end}
                          </span>
                          <span className="font-extrabold">
                            {meta?.label} · {b.title}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  {m.plan.applied ? (
                    <Link
                      href={`/agenda?d=${m.plan.date}`}
                      className="flex h-[46px] items-center justify-center gap-2 rounded-[16px] bg-accent-tint text-sm font-extrabold text-accent-dark"
                    >
                      <Check className="size-4" aria-hidden />
                      Aplicado · ver agenda
                    </Link>
                  ) : (
                    <Button onClick={() => apply(i)} disabled={pending}>
                      Aplicar a la agenda
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Markdown text={m.text} />
                  {!m.error ? <CopyButton text={m.text} className="self-start" /> : null}
                </>
              )}
            </article>
          ),
        )}
        {pending ? (
          <div className="flex items-center gap-2 px-1 text-sm font-semibold text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Gemini está pensando…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-[18px] bottom-[calc(max(env(safe-area-inset-bottom),16px)+76px)] z-20 mx-auto flex max-w-[444px] items-center gap-1.5 rounded-[28px] bg-card py-1.5 pr-1.5 pl-[18px] shadow-[0_6px_18px_rgba(20,32,27,0.08)]"
      >
        <label htmlFor="prompt" className="sr-only">
          Escribe al asistente
        </label>
        <input
          id="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pídele algo a Gemini…"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={pending || !input.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50"
        >
          <ArrowUp className="size-[18px]" aria-hidden />
        </button>
      </form>
    </>
  );
}
