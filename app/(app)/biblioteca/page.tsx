import { Share } from "lucide-react";
import Link from "next/link";

import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/empty-state";
import { SourceRow } from "@/components/source-row";
import { requireUser } from "@/lib/auth";
import { todayLocal } from "@/lib/dates";
import type { MemorySource } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AddSource } from "../memoria/add-source";

export const metadata = { title: "Biblioteca" };

const MONTH = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("memory_sources")
    .select("*")
    .eq("in_library", true)
    .order("consumed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const all = (data ?? []) as MemorySource[];

  const month = todayLocal().slice(0, 7);
  const thisMonth = all.filter((s) => (s.consumed_at ?? s.created_at).slice(0, 7) === month);
  const videos = thisMonth.filter((s) => s.kind === "youtube" || s.kind === "tiktok" || s.kind === "instagram").length;
  const reads = thisMonth.filter((s) => s.kind === "article" || s.kind === "web").length;
  const books = thisMonth.filter((s) => s.kind === "book").length;

  const topicCounts = new Map<string, number>();
  for (const s of all) for (const t of s.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const topics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const list = tema ? all.filter((s) => s.topics.includes(tema)) : all;
  const processing = all.some((s) => s.status === "pending" || s.status === "processing");
  const monthName = MONTH.format(new Date(`${month}-15T12:00:00Z`));

  return (
    <>
      <AutoRefresh active={processing} />
      <header className="flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-semibold text-muted first-letter:uppercase">
          {monthName}: {videos} vídeos · {reads} artículos · {books} libros
        </span>
        <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Biblioteca</h1>
      </header>

      <Link href="/ajustes#compartir" className="flex items-center gap-3 rounded-[22px] bg-accent p-3.5 text-white">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white/15">
          <Share className="size-5" />
        </span>
        <p className="text-[13px] leading-snug text-[#e1f5ec]">
          <strong className="text-white">Compartir → Guardar en Molero</strong> desde YouTube, TikTok o Safari. La IA lo resume y lo añade a tu
          memoria.
        </p>
      </Link>

      {topics.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 text-[13px] font-bold">
          <Link href="/biblioteca" className={cn("flex h-9 items-center rounded-[18px] px-3.5", !tema ? "bg-ink text-white" : "bg-card")}>
            Todo
          </Link>
          {topics.map(([topic, count]) => (
            <Link
              key={topic}
              href={`/biblioteca?tema=${encodeURIComponent(topic)}`}
              className={cn("flex h-9 items-center rounded-[18px] px-3.5", tema === topic ? "bg-ink text-white" : "bg-card")}
            >
              {topic} · {count}
            </Link>
          ))}
        </div>
      ) : null}

      {list.length === 0 ? (
        <EmptyState title="Tu biblioteca está vacía" text="Guarda aquí lo que ves y lees. Luego pregúntale a tu memoria qué aprendiste." />
      ) : (
        list.map((s) => <SourceRow key={s.id} source={s} large />)
      )}

      <AddSource library />
    </>
  );
}
