"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PLATFORMS } from "@/lib/constants";
import type { Platform } from "@/lib/types";

import { adaptContent, applyHook, generateHooks, generateScript } from "../actions";

type Busy = "script" | "hooks" | "adapt" | null;

export function AiPanel({ id, platforms }: { id: string; platforms: Platform[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [hooks, setHooks] = useState<string[]>([]);
  const [adapted, setAdapted] = useState<{ platform: Platform; text: string } | null>(null);
  const [target, setTarget] = useState<Platform>(platforms[0] ?? "linkedin");
  const [, startTransition] = useTransition();

  function run<T>(kind: Exclude<Busy, null>, task: () => Promise<{ data?: T; error?: string }>, onData: (data: T) => void) {
    setBusy(kind);
    setError(null);
    startTransition(async () => {
      const res = await task();
      setBusy(null);
      if (res.error) setError(res.error);
      else if (res.data !== undefined) onData(res.data);
    });
  }

  return (
    <section aria-labelledby="ia" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
      <h2 id="ia" className="flex items-center gap-2 text-base font-extrabold">
        <Sparkles className="size-[18px] text-accent" aria-hidden />
        Con IA
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="tint"
          disabled={busy !== null}
          onClick={() => run("script", () => generateScript(id), () => router.refresh())}
        >
          {busy === "script" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Escribir guion
        </Button>
        <Button variant="tint" disabled={busy !== null} onClick={() => run("hooks", () => generateHooks(id), setHooks)}>
          {busy === "hooks" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          10 hooks
        </Button>
      </div>
      <div className="flex gap-2">
        <label htmlFor="adaptar" className="sr-only">
          Red a la que adaptar
        </label>
        <Select id="adaptar" value={target} onChange={(e) => setTarget(e.target.value as Platform)} className="flex-1">
          {Object.entries(PLATFORMS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button
          variant="dark"
          disabled={busy !== null}
          onClick={() => run("adapt", () => adaptContent(id, target), (text) => setAdapted({ platform: target, text }))}
        >
          {busy === "adapt" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Adaptar
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {hooks.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {hooks.map((hook) => (
            <li key={hook} className="flex items-start gap-2 rounded-[16px] bg-bg p-3">
              <span className="flex-1 text-sm font-semibold">“{hook}”</span>
              <Button
                size="sm"
                variant="white"
                onClick={() =>
                  startTransition(async () => {
                    await applyHook(id, hook);
                    router.refresh();
                  })
                }
              >
                Usar
              </Button>
            </li>
          ))}
        </ol>
      ) : null}

      {adapted ? (
        <div className="flex flex-col gap-2 rounded-[18px] bg-bg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold">{PLATFORMS[adapted.platform]}</span>
            <CopyButton text={adapted.text} variant="white" />
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{adapted.text}</p>
        </div>
      ) : null}
    </section>
  );
}
