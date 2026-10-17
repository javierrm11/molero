import { Search } from "lucide-react";
import Link from "next/link";

import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState } from "@/components/empty-state";
import { SourceRow } from "@/components/source-row";
import { requireUser } from "@/lib/auth";
import type { MemoryKind, MemorySource } from "@/lib/types";
import { cn } from "@/lib/utils";

import { AddSource } from "./add-source";

export const metadata = { title: "Memoria" };

const FILTERS: { id: string; label: string; kinds: MemoryKind[] | null }[] = [
  { id: "todo", label: "Todo", kinds: null },
  { id: "pdf", label: "PDFs", kinds: ["pdf"] },
  { id: "notas", label: "Notas", kinds: ["note", "book"] },
  { id: "webs", label: "Webs y vídeos", kinds: ["web", "article", "youtube", "tiktok", "instagram"] },
];

const STORAGE_LIMIT = 1024 * 1024 * 1024;

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("memory_sources").select("*").order("created_at", { ascending: false }).limit(200);
  const all = (data ?? []) as MemorySource[];
  const filter = FILTERS.find((f) => f.id === tipo) ?? FILTERS[0]!;
  const list = filter.kinds ? all.filter((s) => filter.kinds!.includes(s.kind)) : all;
  const used = all.reduce((sum, s) => sum + (s.file_size ?? 0), 0);
  const chunks = all.reduce((sum, s) => sum + (s.meta.chunks ?? 0), 0);
  const processing = all.some((s) => s.status === "pending" || s.status === "processing");

  return (
    <>
      <AutoRefresh active={processing} />
      <header className="flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-semibold text-muted">
          {all.length} fuentes · {chunks.toLocaleString("es-ES")} fragmentos
        </span>
        <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Memoria</h1>
      </header>

      <Link
        href="/memoria/preguntar"
        className="flex h-14 items-center gap-2.5 rounded-[20px] border-2 border-accent bg-card px-4 text-[15px] font-semibold text-muted"
      >
        <Search className="size-5 text-accent" aria-hidden />
        Pregunta lo que sea a tu memoria…
      </Link>

      <div role="tablist" aria-label="Tipo de fuente" className="scrollbar-none -mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] text-[13px] font-bold">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            role="tab"
            aria-selected={f.id === filter.id}
            href={f.id === "todo" ? "/memoria" : `/memoria?tipo=${f.id}`}
            className={cn("flex h-[38px] shrink-0 items-center rounded-[19px] px-3.5", f.id === filter.id ? "bg-accent text-white" : "bg-card text-muted")}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Nada por aquí todavía" text="Sube tu CV, apuntes, propuestas o notas. Después pregúntale lo que quieras." />
      ) : (
        <section aria-label="Fuentes" className="flex flex-col rounded-[26px] bg-card px-[18px] py-1.5">
          {list.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </section>
      )}

      <AddSource />

      <div className="flex flex-col gap-1.5 rounded-[20px] bg-card px-4 py-3">
        <span className="text-xs font-bold text-muted">
          {(used / 1024 / 1024).toFixed(0)} MB de 1 GB (plan gratuito de Supabase)
        </span>
        <span aria-hidden className="h-1.5 rounded-full bg-accent-tint">
          <span className="block h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(100, (used / STORAGE_LIMIT) * 100)}%` }} />
        </span>
      </div>
    </>
  );
}
