import { Check, Focus } from "lucide-react";
import Link from "next/link";

import { BLOCK_TYPES, TONES } from "@/lib/constants";
import { formatDuration, formatTime, minutesBetween } from "@/lib/dates";
import type { TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function isCurrent(block: Pick<TimeBlock, "start_at" | "end_at" | "status">, now: number): boolean {
  return (
    (block.status === "planned" || block.status === "active") &&
    new Date(block.start_at).getTime() <= now &&
    new Date(block.end_at).getTime() > now
  );
}

/** Fila de un bloque de la agenda en estilo Menta. */
export function BlockRow({ block, now }: { block: TimeBlock; now: number }) {
  const meta = BLOCK_TYPES[block.type];
  const tone = TONES[meta.tone];
  const current = isCurrent(block, now);
  const finished = block.status === "done" || block.status === "skipped";
  const minutes = minutesBetween(block.start_at, block.end_at);

  if (block.type === "rest" && !current) {
    return (
      <li className="flex items-center gap-2.5">
        <span className="w-11 shrink-0 text-xs font-bold text-muted">{formatTime(block.start_at)}</span>
        <Link
          href={`/foco/${block.id}`}
          className="flex-1 rounded-[14px] border-[1.5px] border-dashed border-[#b8c4be] px-3.5 py-2 text-[13px] font-semibold text-muted"
        >
          {block.title}
        </Link>
      </li>
    );
  }

  if (current) {
    const left = Math.max(0, Math.round((new Date(block.end_at).getTime() - now) / 60000));
    return (
      <li className="flex items-stretch gap-2.5">
        <span className="w-11 shrink-0 pt-3.5 text-xs font-extrabold text-accent">{formatTime(block.start_at)}</span>
        <div className="flex flex-1 flex-col gap-2.5 rounded-[22px] bg-accent p-3.5 text-white shadow-[0_8px_20px_rgba(19,111,85,0.25)]">
          <span className="flex justify-between text-xs font-bold text-accent-soft">
            <span>AHORA · hasta {formatTime(block.end_at)}</span>
            <span>quedan {formatDuration(left)}</span>
          </span>
          <span className="text-[17px] font-extrabold">
            {meta.label} · {block.title}
          </span>
          <Link
            href={`/foco/${block.id}`}
            className="flex h-10 items-center justify-center gap-2 rounded-[14px] bg-card text-sm font-extrabold text-accent-dark"
          >
            <Focus className="size-4" aria-hidden />
            Entrar en foco
          </Link>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-stretch gap-2.5">
      <span className="w-11 shrink-0 pt-3 text-xs font-bold text-muted">{formatTime(block.start_at)}</span>
      <Link
        href={`/foco/${block.id}`}
        className={cn(
          "flex flex-1 items-center justify-between gap-3 rounded-[20px] px-3.5 py-3",
          tone.bg,
          tone.text,
          finished && "opacity-70",
        )}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("truncate text-[15px] font-extrabold", finished && "line-through")}>
            {meta.label} · {block.title}
          </span>
          <span className="text-xs font-semibold">
            hasta {formatTime(block.end_at)} · {formatDuration(minutes)}
            {block.status === "skipped" ? " · saltado" : ""}
          </span>
        </span>
        {block.status === "done" ? <Check className="size-[18px] shrink-0" strokeWidth={2.6} aria-label="Hecho" /> : null}
      </Link>
    </li>
  );
}
