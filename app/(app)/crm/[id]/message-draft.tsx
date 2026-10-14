"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { todayLocal } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { addInteraction, draftLeadMessage } from "../actions";

export function MessageDraft({ leadId, hasInteractions }: { leadId: string; hasInteractions: boolean }) {
  const [kind, setKind] = useState<"first" | "follow_up">(hasInteractions ? "follow_up" : "first");
  const [extra, setExtra] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    setLogged(false);
    startTransition(async () => {
      const res = await draftLeadMessage(leadId, kind, extra);
      if (res.error) setError(res.error);
      else setMessage(res.data ?? "");
    });
  }

  function logAsSent() {
    const form = new FormData();
    form.set("lead_id", leadId);
    form.set("type", "message");
    form.set("summary", `Mensaje enviado: ${message.slice(0, 280)}`);
    form.set("date", todayLocal());
    startTransition(async () => {
      const res = await addInteraction(undefined, form);
      if (res?.error) setError(res.error);
      else setLogged(true);
    });
  }

  return (
    <section id="mensaje" aria-labelledby="mensaje-title" className="flex scroll-mt-6 flex-col gap-3 rounded-[26px] bg-card p-[18px]">
      <h2 id="mensaje-title" className="flex items-center gap-2 text-base font-extrabold">
        <Sparkles className="size-[18px] text-accent" aria-hidden />
        Mensaje con IA
      </h2>
      <div role="radiogroup" aria-label="Tipo de mensaje" className="grid grid-cols-2 gap-1 rounded-[16px] bg-bg p-1 text-[13px] font-bold">
        {(
          [
            ["first", "Primer contacto"],
            ["follow_up", "Seguimiento"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={cn("h-10 rounded-[12px]", kind === value ? "bg-card shadow-sm" : "text-muted")}
          >
            {label}
          </button>
        ))}
      </div>
      <label htmlFor="msg-extra" className="sr-only">
        Indicaciones para la IA
      </label>
      <Input id="msg-extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Indicaciones (opcional): proponer llamada el jueves…" />
      <Button onClick={generate} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {message ? "Otra versión" : "Redactar mensaje"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="msg-text" className="sr-only">
            Mensaje
          </label>
          <Textarea id="msg-text" value={message} onChange={(e) => setMessage(e.target.value)} rows={7} />
          <div className="flex gap-2">
            <CopyButton text={message} className="flex-1" />
            <Button variant="tint" size="sm" className="flex-1" onClick={logAsSent} disabled={pending || logged}>
              {logged ? "Registrado" : "Registrar como enviado"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
