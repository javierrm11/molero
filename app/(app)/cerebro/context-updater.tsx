"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { ContextUpdate } from "@/lib/ai/prompts";
import { BRAND_SECTIONS } from "@/lib/constants";
import type { BrandSection } from "@/lib/types";

import { applyContextUpdate, proposeContextUpdate } from "./actions";

export function ContextUpdater({ initialNote, captureId }: { initialNote: string; captureId: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [proposal, setProposal] = useState<ContextUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function propose() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await proposeContextUpdate(note);
      if (res.error) setError(res.error);
      setProposal(res.data ?? null);
    });
  }

  function apply() {
    if (!proposal) return;
    startTransition(async () => {
      const res = await applyContextUpdate(proposal.section, proposal.content, captureId);
      if (res?.error) setError(res.error);
      else {
        setSaved(true);
        setProposal(null);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <section aria-labelledby="actualizar" className="flex flex-col gap-3 rounded-[26px] bg-accent p-[18px] text-white">
      <h2 id="actualizar" className="flex items-center gap-2 text-base font-extrabold">
        <Sparkles className="size-[18px]" aria-hidden />
        Actualizar contexto
      </h2>
      <p className="text-sm text-[#e1f5ec]">Pega una nota, una conversación o un cambio de precios. La IA propone qué sección cambiar y tú confirmas.</p>
      <label htmlFor="nota" className="sr-only">
        Información nueva
      </label>
      <Textarea
        id="nota"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        className="border-0 text-ink"
        placeholder="Desde enero las webs empiezan en…"
      />
      <Button variant="white" onClick={propose} disabled={pending || !note.trim()}>
        {pending && !proposal ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Proponer cambio
      </Button>
      {error ? (
        <p role="alert" className="rounded-[12px] bg-card px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm font-bold">Cerebro actualizado.</p> : null}
      {proposal ? (
        <div className="flex flex-col gap-2 rounded-[20px] bg-card p-4 text-ink">
          <span className="text-xs font-extrabold text-muted">
            SECCIÓN · {BRAND_SECTIONS[proposal.section as BrandSection]?.label ?? proposal.section}
          </span>
          <p className="text-sm font-bold text-accent">{proposal.reason}</p>
          <Markdown text={proposal.content} className="text-sm" />
          <div className="flex gap-2 pt-1">
            <Button variant="soft" size="sm" className="flex-1" onClick={() => setProposal(null)}>
              Descartar
            </Button>
            <Button size="sm" className="flex-[2]" onClick={apply} disabled={pending}>
              Aplicar cambio
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
