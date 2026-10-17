"use client";

import { useState, useTransition } from "react";

import { completeGoogleTask } from "@/app/(app)/resumen/actions";
import { cn } from "@/lib/utils";

/** Casilla de una tarea de Google Tasks: al marcarla se completa en Google. */
export function TaskCheck({ id, title }: { id: string; title: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <label className={cn("flex items-center gap-2 text-[13px] font-semibold", done && "text-muted line-through")}>
      <input
        type="checkbox"
        checked={done}
        disabled={done || pending}
        onChange={() => {
          setDone(true);
          startTransition(async () => {
            const res = await completeGoogleTask(id);
            if (res.error) setDone(false);
          });
        }}
        className="size-[18px] shrink-0"
      />
      <span className="line-clamp-1">{title}</span>
    </label>
  );
}
