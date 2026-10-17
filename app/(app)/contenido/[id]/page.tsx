import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { createBlock } from "@/app/(app)/agenda/actions";
import { BlockForm } from "@/app/(app)/agenda/block-form";
import { requireUser } from "@/lib/auth";
import { CONTENT_STATUS_ORDER, CONTENT_STATUSES, PILLARS } from "@/lib/constants";
import { todayLocal } from "@/lib/dates";
import type { BlockType, Content } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deleteContent, setContentStatus, updateContent } from "../actions";
import { ContentForm } from "../content-form";
import { AiPanel } from "./ai-panel";

export const metadata = { title: "Contenido" };

const NEXT_BLOCK: Record<Content["status"], BlockType> = {
  idea: "record",
  script: "record",
  recorded: "edit",
  edited: "upload",
  published: "upload",
};

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("contents").select("*").eq("id", id).maybeSingle();
  const content = data as Content | null;
  if (!content) notFound();

  const blockType = NEXT_BLOCK[content.status];

  return (
    <>
      <PageHeader title={content.title} eyebrow={CONTENT_STATUSES[content.status]} back={`/contenido?estado=${content.status}`} />

      {content.pillar ? <Badge tone={PILLARS[content.pillar].tone} className="self-start">{PILLARS[content.pillar].label}</Badge> : null}

      <ol aria-label="Estado" className="grid grid-cols-5 gap-1 text-center text-[11px] font-bold">
        {CONTENT_STATUS_ORDER.map((s, i) => {
          const reached = CONTENT_STATUS_ORDER.indexOf(content.status) >= i;
          return (
            <li key={s}>
              <form action={setContentStatus.bind(null, content.id, s)}>
                <button
                  type="submit"
                  aria-current={s === content.status ? "step" : undefined}
                  className={cn(
                    "h-11 w-full rounded-[12px]",
                    s === content.status ? "bg-accent text-white" : reached ? "bg-accent-tint text-accent-dark" : "bg-card text-muted",
                  )}
                >
                  {CONTENT_STATUSES[s]}
                </button>
              </form>
            </li>
          );
        })}
      </ol>

      {content.hook || content.script ? (
        <section className="flex flex-col gap-2 rounded-[26px] bg-card p-[18px]">
          {content.hook ? <p className="text-lg leading-snug font-extrabold">“{content.hook}”</p> : null}
          {content.script ? <Markdown text={content.script} /> : null}
          {content.cta ? <p className="text-sm font-bold text-accent">CTA: {content.cta}</p> : null}
        </section>
      ) : null}

      <AiPanel id={content.id} platforms={content.platforms} />

      {content.hook || content.script ? (
        <Link
          href={`/marca/piezas?contenido=${content.id}`}
          className="flex h-12 items-center justify-center rounded-[16px] bg-card text-sm font-extrabold text-accent-dark"
        >
          Crear carrusel o portada con mi marca
        </Link>
      ) : null}

      <details className="group rounded-[26px] bg-card p-[18px]">
        <summary className="cursor-pointer list-none text-base font-extrabold">Programar en la agenda</summary>
        <div className="pt-4">
          <BlockForm
            action={createBlock}
            contents={[{ id: content.id, title: content.title }]}
            leads={[]}
            submitLabel="Añadir bloque"
            defaults={{
              date: content.planned_at && content.planned_at >= todayLocal() ? content.planned_at : todayLocal(),
              start: "16:00",
              end: blockType === "upload" ? "16:30" : "17:30",
              type: blockType,
              title: content.title,
              content_id: content.id,
            }}
          />
        </div>
      </details>

      <details className="group rounded-[26px] bg-card p-[18px]">
        <summary className="cursor-pointer list-none text-base font-extrabold">Editar</summary>
        <div className="pt-4">
          <ContentForm action={updateContent.bind(null, content.id)} content={content} full submitLabel="Guardar cambios" />
        </div>
      </details>

      <form action={deleteContent.bind(null, content.id)}>
        <SubmitButton variant="danger" className="w-full" pendingText="Borrando…">
          Borrar contenido
        </SubmitButton>
      </form>
    </>
  );
}
