"use client";

import { Moon, Pencil, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { addChecklistItem, finishBlock, startBlock, toggleChecklistItem } from "@/app/(app)/agenda/actions";
import { BLOCK_TYPES } from "@/lib/constants";
import { formatTime, toLocalDate } from "@/lib/dates";
import type { ChecklistItem, Content, TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function FocusScreen({
  block,
  focusOn,
  focusOff,
  focusName,
  content,
  lead,
}: {
  block: TimeBlock;
  focusOn: string | null;
  focusOff: string | null;
  focusName: string | null;
  content: Pick<Content, "id" | "title" | "hook" | "script" | "cta"> | null;
  lead: { id: string; label: string; nextStep: string | null } | null;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [checklist, setChecklist] = useOptimistic<ChecklistItem[], { index: number; done: boolean }>(
    block.checklist,
    (items, { index, done }) => items.map((item, i) => (i === index ? { ...item, done } : item)),
  );

  const meta = BLOCK_TYPES[block.type];
  const start = new Date(block.start_at).getTime();
  const end = new Date(block.end_at).getTime();
  const total = end - start;
  const finished = block.status === "done" || block.status === "skipped";
  const active = block.status === "active";
  const beforeStart = now < start;
  const remaining = beforeStart ? start - now : end - now;
  const ratio = beforeStart ? 1 : Math.max(0, Math.min(1, (end - now) / total));
  const doneCount = checklist.filter((i) => i.done).length;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mantiene la pantalla encendida mientras el bloque está en marcha.
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          lock = l;
        })
        .catch(() => {});
    };
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);

  function start_() {
    startTransition(async () => {
      await startBlock(block.id);
      router.refresh();
      if (focusOn) window.location.href = focusOn;
    });
  }

  function finish(status: "done" | "skipped") {
    startTransition(async () => {
      await finishBlock(block.id, status);
      if (focusOff && active) window.location.href = focusOff;
      router.push(`/agenda?d=${toLocalDate(new Date(block.start_at))}`);
    });
  }

  function toggle(index: number, done: boolean) {
    startTransition(async () => {
      setChecklist({ index, done });
      await toggleChecklistItem(block.id, index, done);
    });
  }

  function addItem() {
    const label = newItem.trim();
    if (!label) return;
    setNewItem("");
    startTransition(async () => {
      await addChecklistItem(block.id, label);
      router.refresh();
    });
  }

  const r = 96;
  const c = 2 * Math.PI * r;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-accent-dark px-5 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),28px)] text-white">
      <div className="flex items-center justify-between gap-2">
        {active && focusName ? (
          <span className="flex h-[34px] items-center gap-2 rounded-full bg-white/15 px-3 text-xs font-bold">
            <Moon className="size-3.5" aria-hidden />
            Concentración «{focusName}»
          </span>
        ) : (
          <Link
            href={`/agenda/bloque/${block.id}`}
            className="flex h-[34px] items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-bold"
          >
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </Link>
        )}
        <Link
          href={`/agenda?d=${toLocalDate(new Date(block.start_at))}`}
          className="flex h-11 items-center gap-1.5 px-1.5 text-[13px] font-bold text-accent-soft"
          onClick={(e) => {
            if (active && !confirm("El bloque sigue en marcha. ¿Seguro que quieres salir del modo foco?")) e.preventDefault();
          }}
        >
          <X className="size-4" aria-hidden />
          Salir
        </Link>
      </div>

      <header className="flex flex-col gap-1 text-center">
        <span className="text-xs font-bold tracking-[0.8px] text-accent-soft">
          {finished ? (block.status === "done" ? "BLOQUE HECHO" : "BLOQUE SALTADO") : "SOLO TOCA ESTO"}
        </span>
        <h1 className="text-[34px] font-extrabold tracking-[-0.8px]">{meta.label}</h1>
        <span className="text-[15px] text-[#e1f5ec]">{block.title}</span>
        <span className="text-[13px] text-accent-soft">
          {formatTime(block.start_at)} – {formatTime(block.end_at)}
        </span>
      </header>

      <div className="relative mx-auto size-[220px]">
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden>
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="14" />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke="var(--color-mint)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${c * ratio} ${c}`}
            transform="rotate(-90 110 110)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5" aria-live="off">
          <span className="text-[46px] font-extrabold tracking-[-1.5px] tabular-nums">
            {finished ? "✓" : now > end ? "00:00" : clock(remaining)}
          </span>
          <span className="text-[13px] font-semibold text-accent-soft">
            {finished ? "terminado" : beforeStart ? "para empezar" : now > end ? "tiempo cumplido" : "restantes"}
          </span>
        </div>
      </div>

      {content ? (
        <section className="flex flex-col gap-2 rounded-[22px] bg-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-accent-soft">CONTENIDO</span>
            <Link href={`/contenido/${content.id}`} className="text-xs font-bold text-accent-soft underline">
              Abrir
            </Link>
          </div>
          {content.hook ? <p className="text-[15px] font-bold">“{content.hook}”</p> : <p className="text-sm">{content.title}</p>}
          {content.script ? (
            <>
              <button type="button" onClick={() => setShowScript((v) => !v)} className="self-start text-[13px] font-bold underline">
                {showScript ? "Ocultar guion" : "Ver guion"}
              </button>
              {showScript ? <Markdown text={content.script} className="text-sm text-[#e1f5ec]" /> : null}
            </>
          ) : null}
        </section>
      ) : null}

      {lead ? (
        <Link href={`/crm/${lead.id}`} className="flex flex-col gap-1 rounded-[22px] bg-white/10 p-4">
          <span className="text-xs font-bold text-accent-soft">LEAD</span>
          <span className="text-[15px] font-bold">{lead.label}</span>
          {lead.nextStep ? <span className="text-sm text-[#e1f5ec]">Próximo paso: {lead.nextStep}</span> : null}
        </Link>
      ) : null}

      {block.type !== "rest" ? (
        <section aria-labelledby="checklist" className="flex flex-col gap-1 rounded-[24px] bg-white/10 p-4">
          <h2 id="checklist" className="mb-1.5 text-[13px] font-extrabold text-accent-soft">
            Checklist · {doneCount}/{checklist.length}
          </h2>
          {checklist.map((item, index) => (
            <label
              key={`${item.label}-${index}`}
              className={cn(
                "flex min-h-10 items-center gap-3 text-[15px] font-semibold",
                item.done && "text-accent-soft line-through",
              )}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => toggle(index, e.target.checked)}
                className="size-[22px] shrink-0"
                style={{ accentColor: "var(--color-mint)" }}
              />
              {item.label}
            </label>
          ))}
          <div className="mt-1 flex items-center gap-2">
            <label htmlFor="nuevo-paso" className="sr-only">
              Añadir paso
            </label>
            <input
              id="nuevo-paso"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Añadir paso…"
              className="h-10 min-w-0 flex-1 rounded-[14px] bg-white/10 px-3 text-sm text-white placeholder:text-accent-soft/80 focus:outline-none"
            />
            <button
              type="button"
              aria-label="Añadir paso"
              onClick={addItem}
              className="flex size-10 items-center justify-center rounded-[14px] bg-white/15"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </section>
      ) : null}

      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        {finished ? (
          <Link
            href={`/agenda?d=${toLocalDate(new Date(block.start_at))}`}
            className="flex h-14 items-center justify-center rounded-[20px] bg-card text-base font-extrabold text-accent-dark"
          >
            Volver a la agenda
          </Link>
        ) : active ? (
          <>
            {focusOn ? (
              <a href={focusOn} className="text-center text-[13px] font-bold text-accent-soft underline">
                Volver a activar la Concentración
              </a>
            ) : null}
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => finish("skipped")}
                className="h-14 flex-1 rounded-[20px] bg-white/15 text-[15px] font-bold disabled:opacity-60"
              >
                Saltar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => finish("done")}
                className="h-14 flex-[2] rounded-[20px] bg-card text-base font-extrabold text-accent-dark disabled:opacity-60"
              >
                Terminar bloque
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={start_}
              className="h-14 rounded-[20px] bg-card text-base font-extrabold text-accent-dark disabled:opacity-60"
            >
              {focusOn ? "Empezar y activar Concentración" : "Empezar bloque"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => finish("skipped")}
              className="h-11 text-sm font-bold text-accent-soft"
            >
              Saltar este bloque
            </button>
          </>
        )}
      </div>
    </main>
  );
}
