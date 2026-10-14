import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { Textarea } from "@/components/ui/input";
import type { CaptureAi } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { BRAND_SECTION_ORDER, BRAND_SECTIONS } from "@/lib/constants";
import { ensureBrandContext } from "@/lib/data";
import { formatShortDate, toLocalDate } from "@/lib/dates";
import type { BrandContext, Capture } from "@/lib/types";

import { saveSection } from "./actions";
import { ContextUpdater } from "./context-updater";

export const metadata = { title: "Cerebro Molero" };

export default async function BrainPage({ searchParams }: { searchParams: Promise<{ nota?: string }> }) {
  const { nota } = await searchParams;
  const { supabase } = await requireUser();
  await ensureBrandContext(supabase);
  const { data } = await supabase.from("brand_context").select("*");
  const sections = new Map(((data ?? []) as BrandContext[]).map((s) => [s.section, s]));

  let initialNote = "";
  let captureId: string | null = null;
  if (nota) {
    const { data: capture } = await supabase.from("captures").select("*").eq("id", nota).maybeSingle();
    const c = capture as (Capture & { ai: Partial<CaptureAi> }) | null;
    if (c) {
      captureId = c.id;
      initialNote = c.ai.context?.note ? `${c.ai.context.note}\n\n${c.raw_text ?? ""}`.trim() : (c.raw_text ?? "");
    }
  }

  return (
    <>
      <PageHeader title="Cerebro Molero" eyebrow="Lo que la IA sabe de tu marca" back="/" />

      <ContextUpdater initialNote={initialNote} captureId={captureId} />

      {BRAND_SECTION_ORDER.map((section) => {
        const row = sections.get(section);
        return (
          <details key={section} className="rounded-[26px] bg-card p-[18px]">
            <summary className="flex cursor-pointer list-none flex-col gap-0.5">
              <span className="text-base font-extrabold">{BRAND_SECTIONS[section].label}</span>
              <span className="text-[13px] text-muted">
                {BRAND_SECTIONS[section].hint}
                {row ? ` · actualizado ${formatShortDate(toLocalDate(new Date(row.updated_at)))}` : ""}
              </span>
            </summary>
            <div className="pt-4">
              <ActionForm action={saveSection.bind(null, section)} submitLabel="Guardar" successText="Guardado." submitVariant="tint">
                <label htmlFor={`sec-${section}`} className="sr-only">
                  {BRAND_SECTIONS[section].label}
                </label>
                <Textarea id={`sec-${section}`} name="content" rows={10} defaultValue={row?.content ?? ""} className="font-medium" />
              </ActionForm>
            </div>
          </details>
        );
      })}
    </>
  );
}
