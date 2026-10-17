"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { BLOCK_TYPES } from "@/lib/constants";
import type { DailyCheckin } from "@/lib/types";
import { cn } from "@/lib/utils";

import { applyTomorrow, submitCheckin } from "./actions";

export function CheckinForm({ existing }: { existing: DailyCheckin | null }) {
  const [state, formAction, pending] = useActionState(submitCheckin, undefined);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [applied, setApplied] = useState(existing?.applied ?? false);
  const [applying, startApply] = useTransition();
  const [applyError, setApplyError] = useState<string | null>(null);
  const checkin = state?.checkin ?? existing;

  return (
    <>
      <form action={formAction} className="flex flex-col gap-3.5">
        <fieldset className="flex flex-col gap-2.5 rounded-[22px] bg-white/10 p-3.5">
          <legend className="sr-only">Nota del día</legend>
          <span aria-hidden className="text-[15px] font-extrabold">
            Del 1 al 5, ¿qué nota le pones?
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-[14px] text-base font-extrabold",
                  mood === n ? "bg-mint text-accent-dark" : "bg-white/12 text-white",
                )}
              >
                <input type="radio" name="mood" value={n} checked={mood === n} onChange={() => setMood(n)} className="sr-only" />
                {n}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="nota-noche" className="sr-only">
          Cuéntame cómo ha ido
        </label>
        <textarea
          id="nota-noche"
          name="note"
          rows={3}
          defaultValue={existing?.note ?? ""}
          placeholder="Qué ha ido bien, qué te ha frenado…"
          className="rounded-[20px] bg-white/12 px-4 py-3 text-[15px] leading-relaxed text-white placeholder:text-[#a9cfc0] focus:outline-none"
        />

        {state?.error ? (
          <p role="alert" className="rounded-[14px] bg-white px-3 py-2 text-sm font-semibold text-danger">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-[52px] items-center justify-center gap-2 rounded-[18px] bg-white text-[15px] font-extrabold text-accent-dark disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Pensando…" : checkin ? "Volver a revisar" : "Revisar el día"}
        </button>
      </form>

      {checkin?.ai_good || checkin?.ai_improve ? (
        <article className="flex flex-col gap-2.5 rounded-[22px] bg-white p-4 text-ink" aria-live="polite">
          {checkin.ai_good ? (
            <div className="flex gap-2.5 text-sm leading-snug">
              <span className="h-5 shrink-0 rounded-[8px] bg-accent-tint px-2 text-[11px] leading-5 font-extrabold text-accent-dark">BIEN</span>
              <span>{checkin.ai_good}</span>
            </div>
          ) : null}
          {checkin.ai_improve ? (
            <div className="flex gap-2.5 text-sm leading-snug">
              <span className="h-5 shrink-0 rounded-[8px] bg-peach-tint px-2 text-[11px] leading-5 font-extrabold text-peach-ink">MEJORA</span>
              <span>{checkin.ai_improve}</span>
            </div>
          ) : null}
          {checkin.ai_tomorrow ? (
            applied ? (
              <Link href={`/agenda?d=${checkin.ai_tomorrow.date}`} className="flex h-11 items-center justify-center rounded-[14px] bg-accent-tint text-sm font-extrabold text-accent-dark">
                Añadido a mañana · ver agenda
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  disabled={applying}
                  onClick={() =>
                    startApply(async () => {
                      const res = await applyTomorrow(checkin.id);
                      if (res.error) setApplyError(res.error);
                      else setApplied(true);
                    })
                  }
                  className="h-11 rounded-[14px] bg-accent text-sm font-extrabold text-white disabled:opacity-60"
                >
                  Mañana {checkin.ai_tomorrow.start}–{checkin.ai_tomorrow.end}: {BLOCK_TYPES[checkin.ai_tomorrow.type].label} · aplicar
                </button>
                {applyError ? <p className="text-xs font-semibold text-danger">{applyError}</p> : null}
              </>
            )
          ) : null}
        </article>
      ) : null}
    </>
  );
}
