import { Download } from "lucide-react";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import type { BrandPiece } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deletePiece, updateSlides } from "../../actions";

export const metadata = { title: "Pieza" };

const RATIO = { carousel: "aspect-[4/5]", cover: "aspect-video", linkedin: "aspect-square" } as const;

export default async function PiecePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("brand_pieces").select("*").eq("id", id).maybeSingle();
  const piece = data as BrandPiece | null;
  if (!piece) notFound();
  // Cambia cuando se editan los textos para que el navegador no use la imagen anterior.
  let hash = 0;
  for (const ch of JSON.stringify(piece.slides)) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const version = (hash >>> 0).toString(36);

  return (
    <>
      <PageHeader title={piece.title} eyebrow={`${piece.slides.length} ${piece.slides.length === 1 ? "imagen" : "diapositivas"}`} back="/marca/piezas" />

      <div
        aria-label="Vista previa"
        className={cn("scrollbar-none -mx-[18px] flex gap-3 overflow-x-auto px-[18px] pb-1", piece.format !== "carousel" && "flex-col")}
      >
        {piece.slides.map((_, i) => (
          <div key={i} className={cn("flex shrink-0 flex-col gap-2", piece.format === "carousel" ? "w-[250px]" : "w-full")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/piezas/${piece.id}/${i + 1}?v=${version}`}
              alt={`Diapositiva ${i + 1}`}
              className={cn("w-full rounded-[18px] bg-card object-cover shadow-[0_10px_24px_rgba(20,32,27,0.12)]", RATIO[piece.format])}
            />
            <a
              href={`/api/piezas/${piece.id}/${i + 1}?v=${version}`}
              download={`molero-${piece.id.slice(0, 6)}-${i + 1}.png`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] bg-card text-[13px] font-bold"
            >
              <Download className="size-4" aria-hidden />
              Descargar {i + 1}
            </a>
          </div>
        ))}
      </div>

      <details className="rounded-[26px] bg-card p-[18px]">
        <summary className="cursor-pointer list-none text-base font-extrabold">Editar textos</summary>
        <div className="pt-4">
          <ActionForm action={updateSlides.bind(null, piece.id)} submitLabel="Guardar textos" successText="Guardado. Las imágenes ya están actualizadas.">
            {piece.slides.map((s, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-[18px] bg-bg p-3">
                <span className="text-xs font-extrabold text-muted">
                  {i + 1} · {s.kind.toUpperCase()}
                </span>
                <Field label="Título" htmlFor={`t-${i}`}>
                  <Input id={`t-${i}`} name={`title_${i}`} defaultValue={s.title} />
                </Field>
                <Field label={s.kind === "list" ? "Puntos (uno por línea)" : "Texto"} htmlFor={`b-${i}`}>
                  <Textarea id={`b-${i}`} name={`body_${i}`} rows={s.kind === "list" ? 4 : 2} defaultValue={s.body ?? ""} />
                </Field>
              </div>
            ))}
          </ActionForm>
        </div>
      </details>

      <form action={deletePiece.bind(null, piece.id)}>
        <SubmitButton variant="danger" className="w-full" pendingText="Borrando…">
          Borrar pieza
        </SubmitButton>
      </form>
    </>
  );
}
