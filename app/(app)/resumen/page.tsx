import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { BRIEFING_SOURCE_LABEL } from "@/lib/briefing";
import { BLOCK_TYPES, TONES, type Tone } from "@/lib/constants";
import { getBlocksForDay } from "@/lib/data";
import { formatDuration, formatLongDate, formatTime, minutesBetween, todayLocal } from "@/lib/dates";
import type { Briefing, BriefingItem, TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

import { GenerateButton, ListenButton } from "./briefing-controls";

export const metadata = { title: "Resumen de hoy" };

const SOURCE_TONE: Record<BriefingItem["source"], Tone> = {
  gmail: "peach",
  calendar: "blue",
  tasks: "violet",
  crm: "green",
  contenido: "green",
  uco: "blue",
  agenda: "butter",
};

export default async function BriefingPage() {
  const { supabase } = await requireUser();
  const today = todayLocal();
  const [{ data }, blocksRaw] = await Promise.all([
    supabase.from("briefings").select("*").eq("date", today).maybeSingle(),
    getBlocksForDay(supabase, today),
  ]);
  const briefing = data as Briefing | null;
  const blocks = (blocksRaw as TimeBlock[]).filter((b) => b.type !== "rest");
  const totalMinutes = blocks.reduce((s, b) => s + minutesBetween(b.start_at, b.end_at), 0);

  return (
    <>
      <PageHeader
        title="Tu resumen"
        eyebrow={`${formatLongDate(today)}${briefing?.sent_at ? ` · enviado a las ${formatTime(briefing.sent_at)}` : ""}`}
        back="/"
        action={briefing ? <ListenButton text={`${briefing.focus}. ${briefing.summary}. ${briefing.items.map((i) => i.text).join(". ")}`} /> : undefined}
      />

      {!briefing ? (
        <EmptyState
          title="Aún no hay resumen de hoy"
          text="Se genera solo cada mañana. Si no quieres esperar, prepáralo ahora con tu agenda, Google y el CRM."
        >
          <div className="mt-2 w-full">
            <GenerateButton label="Generar ahora" />
          </div>
        </EmptyState>
      ) : (
        <>
          <section className="flex flex-col gap-2 rounded-[26px] bg-accent p-[18px] text-white">
            <h2 className="text-xs font-bold tracking-[0.6px] text-accent-soft">EL FOCO DE HOY</h2>
            <p className="text-lg leading-snug font-extrabold">{briefing.focus}</p>
            <p className="text-sm leading-relaxed text-[#e1f5ec]">{briefing.summary}</p>
          </section>

          {briefing.items.length > 0 ? (
            <section aria-labelledby="importa" className="flex flex-col gap-2.5 rounded-[26px] bg-card px-[18px] py-4">
              <h2 id="importa" className="text-[15px] font-extrabold">
                Lo que importa
              </h2>
              {briefing.items.map((item, i) => (
                <div key={i} className="flex gap-2.5 text-sm leading-snug">
                  <span
                    className={cn(
                      "h-5 shrink-0 rounded-[8px] px-2 text-[11px] leading-5 font-extrabold uppercase",
                      TONES[SOURCE_TONE[item.source]].bg,
                      TONES[SOURCE_TONE[item.source]].text,
                    )}
                  >
                    {BRIEFING_SOURCE_LABEL[item.source]}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}

      {blocks.length > 0 ? (
        <Link href="/agenda" className="flex flex-col gap-2 rounded-[26px] bg-card px-[18px] py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold">Tu día</h2>
            <span className="text-xs font-bold text-muted">
              {blocks.length} bloques · {formatDuration(totalMinutes)}
            </span>
          </div>
          <div aria-hidden className="flex h-3 gap-1">
            {blocks.map((b) => (
              <span
                key={b.id}
                className={cn("rounded-[4px]", b.type === "record" ? "bg-accent" : TONES[BLOCK_TYPES[b.type].tone].bg)}
                style={{ flex: minutesBetween(b.start_at, b.end_at) }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-muted">
            <span>{formatTime(blocks[0]!.start_at)}</span>
            <span>{formatTime(blocks.at(-1)!.end_at)}</span>
          </div>
        </Link>
      ) : null}

      {briefing ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [briefing.stats.emails ?? 0, "correos sin leer"],
              [briefing.stats.tasks ?? 0, "tareas"],
              [briefing.stats.follow_ups ?? 0, "seguimientos"],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-[20px] bg-card px-1 py-3">
                <span className="text-xl font-extrabold">{value}</span>
                <span className="text-[11px] font-bold text-muted">{label}</span>
              </div>
            ))}
          </div>
          <GenerateButton label="Volver a generar" variant="white" />
        </>
      ) : null}
    </>
  );
}
