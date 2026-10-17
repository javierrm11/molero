import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { BRAND_FONTS } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { getBrandKit } from "@/lib/brand";

import { saveKit } from "./actions";
import { KitProposal } from "./kit-proposal";

export const metadata = { title: "Kit de marca" };

export default async function BrandPage() {
  const { supabase, user } = await requireUser();
  const kit = await getBrandKit(supabase, user.id);
  const fontsHref = `https://fonts.googleapis.com/css2?${[...new Set([kit.display_font, kit.body_font])]
    .map((f) => `family=${encodeURIComponent(f)}:wght@500;800`)
    .join("&")}&display=swap`;

  return (
    <>
      {/* Carga las tipografías del kit solo para la vista previa. */}
      <link rel="stylesheet" href={fontsHref} precedence="default" />
      <header className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">Lo usan la IA y el generador de piezas</span>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Kit de marca</h1>
        </div>
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-[16px] text-xl font-extrabold text-white"
          style={{ background: kit.colors[0]?.hex, fontFamily: kit.display_font }}
        >
          {kit.logo_text}
        </span>
      </header>

      <section aria-label="Vista previa" className="flex flex-col gap-3 rounded-[26px] bg-card px-[18px] py-4">
        <div className="flex flex-wrap gap-1.5">
          {kit.tone.map((t) => (
            <span key={t} className="rounded-[10px] bg-accent-tint px-2.5 py-1.5 text-xs font-extrabold text-accent-dark">
              {t}
            </span>
          ))}
          {kit.brand_values.map((v) => (
            <span key={v} className="rounded-[10px] bg-sky-tint px-2.5 py-1.5 text-xs font-extrabold text-sky-ink">
              {v}
            </span>
          ))}
        </div>
        {kit.voice ? <p className="text-[13px] leading-snug text-muted">«{kit.voice}»</p> : null}
        <div className="grid grid-cols-5 gap-2">
          {kit.colors.map((c) => (
            <div key={`${c.name}${c.hex}`} className="flex flex-col gap-1">
              <span className="h-[52px] rounded-[14px] border border-line" style={{ background: c.hex }} />
              <span className="truncate text-[11px] font-extrabold">{c.name}</span>
              <span className="text-[10px] text-muted">{c.hex}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <span className="text-[30px] leading-none font-extrabold tracking-[-1px]" style={{ fontFamily: kit.display_font }}>
            Aprende IA fácil.
          </span>
          <span className="text-[15px] text-muted" style={{ fontFamily: kit.body_font }}>
            {kit.display_font} para títulos · {kit.body_font} para el texto
          </span>
        </div>
      </section>

      <Link href="/marca/piezas" className="flex h-[52px] items-center justify-center rounded-[18px] bg-accent text-[15px] font-extrabold text-white">
        Crear una pieza
      </Link>

      <KitProposal />

      <details className="rounded-[26px] bg-card p-[18px]">
        <summary className="cursor-pointer list-none text-base font-extrabold">Editar el kit</summary>
        <div className="pt-4">
          <ActionForm action={saveKit} submitLabel="Guardar kit" successText="Guardado.">
            <Field label="Tono (separado por comas)" htmlFor="k-tone">
              <Input id="k-tone" name="tone" defaultValue={kit.tone.join(", ")} />
            </Field>
            <Field label="Valores (separados por comas)" htmlFor="k-values">
              <Input id="k-values" name="brand_values" defaultValue={kit.brand_values.join(", ")} />
            </Field>
            <Field label="Voz" htmlFor="k-voice">
              <Textarea id="k-voice" name="voice" rows={2} defaultValue={kit.voice ?? ""} />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="px-1 pb-1.5 text-[13px] font-bold text-muted">Colores (principal, texto, fondo, acento claro, acento cálido)</legend>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <label htmlFor={`k-hex-${i}`} className="sr-only">
                    Color {i + 1}
                  </label>
                  <input
                    id={`k-hex-${i}`}
                    type="color"
                    name={`color_hex_${i}`}
                    defaultValue={kit.colors[i]?.hex ?? "#136F55"}
                    className="h-12 w-14 shrink-0 cursor-pointer rounded-[14px] border border-line bg-card p-1"
                  />
                  <label htmlFor={`k-name-${i}`} className="sr-only">
                    Nombre del color {i + 1}
                  </label>
                  <Input id={`k-name-${i}`} name={`color_name_${i}`} defaultValue={kit.colors[i]?.name ?? ""} />
                </div>
              ))}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Títulos" htmlFor="k-display">
                <Select id="k-display" name="display_font" defaultValue={kit.display_font}>
                  {BRAND_FONTS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Texto" htmlFor="k-body">
                <Select id="k-body" name="body_font" defaultValue={kit.body_font}>
                  {BRAND_FONTS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Logo (1–3 letras)" htmlFor="k-logo">
              <Input id="k-logo" name="logo_text" maxLength={3} defaultValue={kit.logo_text} />
            </Field>
          </ActionForm>
        </div>
      </details>
    </>
  );
}
