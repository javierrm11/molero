"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { BrandKitAi } from "@/lib/ai/prompts";

import { applyKitProposal, proposeKit } from "./actions";

/** Pide a la IA un kit de marca a partir del Cerebro y permite aplicarlo. */
export function KitProposal() {
  const [proposal, setProposal] = useState<BrandKitAi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <Button
        variant="tint"
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setApplied(false);
            const res = await proposeKit();
            if (res.error) setError(res.error);
            setProposal(res.data ?? null);
          })
        }
      >
        {pending && !proposal ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Sparkles className="size-[18px]" aria-hidden />}
        Proponer un kit con IA
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {proposal ? (
        <div className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
          <p className="text-sm">
            <strong>Tono:</strong> {proposal.tone.join(", ")} · <strong>Valores:</strong> {proposal.brand_values.join(", ")}
          </p>
          <p className="text-sm text-muted">«{proposal.voice}»</p>
          <div className="grid grid-cols-5 gap-2">
            {proposal.colors.map((c) => (
              <div key={c.hex} className="flex flex-col gap-1">
                <span className="h-12 rounded-[12px] border border-line" style={{ background: c.hex }} />
                <span className="text-[11px] font-extrabold">{c.name}</span>
                <span className="text-[10px] text-muted">{c.hex}</span>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <strong>Tipografías:</strong> {proposal.display_font} (títulos) · {proposal.body_font} (texto)
          </p>
          <Button
            disabled={pending || applied}
            onClick={() =>
              startTransition(async () => {
                const res = await applyKitProposal(proposal);
                if (res.error) setError(res.error);
                else setApplied(true);
              })
            }
          >
            {applied ? "Aplicado" : "Usar este kit"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
