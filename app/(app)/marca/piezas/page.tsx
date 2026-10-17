import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Field, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { formatShortDate, toLocalDate } from "@/lib/dates";
import type { BrandPiece, Content, PieceFormat } from "@/lib/types";

import { createPiece } from "../actions";

export const metadata = { title: "Generador de piezas" };

const FORMAT_LABELS: Record<PieceFormat, string> = {
  carousel: "Carrusel (1080×1350)",
  cover: "Portada de YouTube (1280×720)",
  linkedin: "Imagen de LinkedIn (1200×1200)",
};

export default async function PiecesPage({ searchParams }: { searchParams: Promise<{ contenido?: string }> }) {
  const { contenido } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: piecesData }, { data: contentsData }] = await Promise.all([
    supabase.from("brand_pieces").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("contents").select("id, title, hook, script").order("updated_at", { ascending: false }).limit(50),
  ]);
  const pieces = (piecesData ?? []) as BrandPiece[];
  const contents = ((contentsData ?? []) as Pick<Content, "id" | "title" | "hook" | "script">[]).filter((c) => c.hook || c.script);

  return (
    <>
      <PageHeader title="Generador de piezas" eyebrow="Con tu kit de marca" back="/marca" />

      <section className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 className="text-base font-extrabold">Nueva pieza</h2>
        {contents.length === 0 ? (
          <p className="text-sm text-muted">
            Necesitas un contenido con hook o guion. Escríbelo en <Link href="/contenido" className="font-bold">Contenido</Link> con la IA.
          </p>
        ) : (
          <ActionForm action={createPiece} submitLabel="Generar con IA" pendingText="Diseñando…">
            <Field label="Desde el guion de" htmlFor="p-content">
              <Select id="p-content" name="content_id" defaultValue={contenido ?? contents[0]?.id}>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Formato" htmlFor="p-format">
              <Select id="p-format" name="format" defaultValue="carousel">
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </ActionForm>
        )}
      </section>

      {pieces.length === 0 ? (
        <EmptyState title="Aún no hay piezas" text="Genera un carrusel o una portada a partir de un guion." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {pieces.map((p) => (
            <Link key={p.id} href={`/marca/piezas/${p.id}`} className="flex flex-col gap-2 rounded-[22px] bg-card p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/piezas/${p.id}/1`} alt={p.title} loading="lazy" className="aspect-[4/5] w-full rounded-[14px] bg-bg object-cover" />
              <span className="line-clamp-2 px-1 text-[13px] leading-snug font-extrabold">{p.title}</span>
              <span className="px-1 pb-1 text-xs text-muted">
                {FORMAT_LABELS[p.format].split(" (")[0]} · {formatShortDate(toLocalDate(new Date(p.created_at)))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
