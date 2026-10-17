import Link from "next/link";

import { MEMORY_KINDS, MEMORY_STATUS, TONES } from "@/lib/constants";
import { formatShortDate, toLocalDate } from "@/lib/dates";
import type { MemorySource } from "@/lib/types";
import { cn } from "@/lib/utils";

function detail(s: MemorySource): string {
  const parts: string[] = [];
  if (s.meta.pages) parts.push(`${s.meta.pages} págs`);
  if (s.meta.duration) parts.push(s.meta.duration);
  if (s.meta.channel) parts.push(s.meta.channel);
  if (s.key_points.length > 0) parts.push(`${s.key_points.length} ideas`);
  if (s.topics[0]) parts.push(s.topics[0]);
  parts.push(formatShortDate(s.consumed_at ?? toLocalDate(new Date(s.created_at))));
  return parts.join(" · ");
}

/** Fila de una fuente de la memoria o de la biblioteca. */
export function SourceRow({ source, large = false }: { source: MemorySource; large?: boolean }) {
  const kind = MEMORY_KINDS[source.kind];
  const tone = TONES[kind.tone];
  const statusColor = source.status === "ready" ? "text-accent" : source.status === "error" ? "text-danger" : "text-peach-ink";

  return (
    <Link
      href={`/memoria/${source.id}`}
      className={cn("flex items-center gap-3", large ? "rounded-[24px] bg-card p-3.5" : "border-b border-line py-3 last:border-0")}
    >
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center font-extrabold",
          large ? "h-16 w-20 rounded-[14px] text-[10px]" : "size-10 rounded-[14px] text-[9px]",
          source.kind === "youtube" ? "bg-ink text-white" : cn(tone.bg, tone.text),
        )}
      >
        {kind.short}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("line-clamp-2 font-extrabold leading-snug", large ? "text-[15px]" : "text-sm")}>{source.title}</span>
        <span className="truncate text-xs text-muted">{detail(source)}</span>
      </span>
      {source.status !== "ready" ? <span className={cn("shrink-0 text-[11px] font-extrabold", statusColor)}>{MEMORY_STATUS[source.status]}</span> : null}
    </Link>
  );
}
