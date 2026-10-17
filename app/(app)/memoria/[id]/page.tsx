import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { MEMORY_KINDS, MEMORY_STATUS } from "@/lib/constants";
import { formatShortDate, toLocalDate } from "@/lib/dates";
import { relatedSources } from "@/lib/memory";
import type { MemorySource } from "@/lib/types";

import { deleteSource, reprocessSource, toggleLibrary, updateSourceNote } from "../actions";
import { AskMemory } from "../ask-memory";

export const metadata = { title: "Fuente" };

export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("memory_sources").select("*").eq("id", id).maybeSingle();
  const source = data as MemorySource | null;
  if (!source) notFound();

  const kind = MEMORY_KINDS[source.kind];
  const ready = source.status === "ready";
  const [related, signed] = await Promise.all([
    ready ? relatedSources({ client: supabase, userId: user.id }, id).catch(() => []) : Promise.resolve([]),
    source.file_path ? supabase.storage.from("memory").createSignedUrl(source.file_path, 3600) : Promise.resolve({ data: null }),
  ]);
  const originalUrl = source.url ?? signed.data?.signedUrl ?? null;
  const back = source.in_library ? "/biblioteca" : "/memoria";
  const when = source.consumed_at ?? toLocalDate(new Date(source.created_at));

  return (
    <>
      <AutoRefresh active={source.status === "pending" || source.status === "processing"} />
      <PageHeader title={kind.label} eyebrow={source.in_library ? "Biblioteca" : "Memoria"} back={back} />

      <section className="flex flex-col justify-end gap-1.5 rounded-[24px] bg-ink p-4 text-white" style={{ minHeight: 150 }}>
        <span className="text-[11px] font-extrabold text-mint">
          {[kind.label.toUpperCase(), source.meta.duration, source.meta.pages ? `${source.meta.pages} PÁGS` : null, formatShortDate(when).toUpperCase()]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <h2 className="text-xl leading-tight font-extrabold tracking-[-0.4px]">{source.title}</h2>
        {source.meta.channel ? <span className="text-[13px] text-white/75">{source.meta.channel}</span> : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {originalUrl ? (
          <a href={originalUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-1.5 rounded-[14px] bg-card px-3.5 text-[13px] font-bold">
            <ExternalLink className="size-4" aria-hidden />
            Ver original
          </a>
        ) : null}
        <form action={toggleLibrary.bind(null, source.id, !source.in_library)}>
          <SubmitButton variant="white" size="sm">
            {source.in_library ? "Quitar de la biblioteca" : "Añadir a la biblioteca"}
          </SubmitButton>
        </form>
      </div>

      {!ready ? (
        <section className="flex flex-col gap-2 rounded-[22px] bg-peach-tint p-4 text-peach-ink">
          <span className="text-sm font-extrabold">{MEMORY_STATUS[source.status]}</span>
          {source.error ? <p className="text-sm">{source.error}</p> : <p className="text-sm">La IA lo está leyendo y resumiendo. Tarda unos segundos.</p>}
          {source.status === "error" ? (
            <form action={reprocessSource.bind(null, source.id)}>
              <SubmitButton variant="white" size="sm">
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </SubmitButton>
            </form>
          ) : null}
        </section>
      ) : null}

      {source.summary ? (
        <section className="flex flex-col gap-2 rounded-[26px] bg-card px-[18px] py-4">
          <h2 className="text-[15px] font-extrabold">Resumen</h2>
          <p className="text-sm leading-relaxed">{source.summary}</p>
        </section>
      ) : null}

      {source.key_points.length > 0 ? (
        <section aria-labelledby="ideas" className="flex flex-col gap-2.5 rounded-[26px] bg-card px-[18px] py-4">
          <h2 id="ideas" className="text-[15px] font-extrabold">
            Lo que aprendiste
          </h2>
          {source.key_points.map((point, i) => (
            <div key={i} className="flex gap-2.5 text-sm leading-snug">
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[8px] bg-accent-tint text-xs font-extrabold text-accent-dark">
                {i + 1}
              </span>
              <span>{point}</span>
            </div>
          ))}
          {source.topics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {source.topics.map((t) => (
                <Badge key={t} tone="blue">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="conecta" className="flex flex-col gap-2">
          <h2 id="conecta" className="px-1 text-[13px] font-bold text-muted">
            Conecta con
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => (
              <Link key={r.id} href={`/memoria/${r.id}`} className="rounded-[12px] bg-violet-tint px-3 py-2 text-xs font-extrabold text-violet-ink">
                {MEMORY_KINDS[r.kind].label}: {r.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {ready ? (
        <section aria-labelledby="preguntar" className="flex flex-col gap-3">
          <h2 id="preguntar" className="px-1 text-[13px] font-bold text-muted">
            Pregúntale a esta fuente
          </h2>
          <AskMemory sourceId={source.id} placeholder="Pregunta sobre esto…" fixed={false} />
        </section>
      ) : null}

      {source.body && (source.kind === "note" || source.kind === "book") ? (
        <details className="rounded-[26px] bg-card p-[18px]">
          <summary className="cursor-pointer list-none text-[15px] font-extrabold">Texto completo</summary>
          <div className="pt-3">
            <Markdown text={source.body} className="text-sm" />
          </div>
        </details>
      ) : null}

      <section className="rounded-[26px] bg-card p-[18px]">
        <ActionForm action={updateSourceNote.bind(null, source.id)} submitLabel="Guardar nota" successText="Guardada." submitVariant="tint">
          <label htmlFor="nota" className="px-1 text-xs font-extrabold text-muted">
            TU NOTA
          </label>
          <Textarea id="nota" name="note" rows={3} defaultValue={source.user_note ?? ""} placeholder="Para qué te sirve, dónde usarlo…" />
        </ActionForm>
      </section>

      <form action={deleteSource.bind(null, source.id, back)}>
        <SubmitButton variant="danger" className="w-full" pendingText="Borrando…">
          Borrar de la memoria
        </SubmitButton>
      </form>
    </>
  );
}
