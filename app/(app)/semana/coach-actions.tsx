"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { applyCoachChange, generateCoachReport } from "@/app/noche/actions";

export function GenerateReport({ week, label }: { week: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant="white"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await generateCoachReport(week);
            if (res.error) setError(res.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Analizando la semana…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ApplyChange({ reportId, applied }: { reportId: string; applied: boolean }) {
  const [done, setDone] = useState(applied);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={done || pending}
        onClick={() =>
          startTransition(async () => {
            const res = await applyCoachChange(reportId);
            if (res.error) setError(res.error);
            else setDone(true);
          })
        }
        className="h-11 rounded-[14px] bg-card text-sm font-extrabold text-accent-dark disabled:opacity-70"
      >
        {done ? "Añadido de lunes a viernes" : "Añadirlo a la agenda de la semana que viene"}
      </button>
      {error ? <p className="text-xs font-semibold text-white">{error}</p> : null}
    </>
  );
}
