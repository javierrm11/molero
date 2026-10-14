import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { formatTime, toLocalDate } from "@/lib/dates";
import type { Content, Lead, TimeBlock } from "@/lib/types";

import { deleteBlock, updateBlock } from "../../actions";
import { BlockForm } from "../../block-form";

export const metadata = { title: "Editar bloque" };

export default async function EditBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data }, contentsRes, leadsRes] = await Promise.all([
    supabase.from("time_blocks").select("*").eq("id", id).maybeSingle(),
    supabase.from("contents").select("id, title").neq("status", "published").limit(40),
    supabase.from("leads").select("id, name, company").not("status", "in", "(won,lost)").limit(40),
  ]);
  const block = data as TimeBlock | null;
  if (!block) notFound();
  const date = toLocalDate(new Date(block.start_at));

  return (
    <>
      <PageHeader title="Editar bloque" back={`/foco/${block.id}`} />
      <div className="rounded-[26px] bg-card p-[18px]">
        <BlockForm
          action={updateBlock.bind(null, block.id)}
          contents={(contentsRes.data ?? []) as Pick<Content, "id" | "title">[]}
          leads={((leadsRes.data ?? []) as Pick<Lead, "id" | "name" | "company">[]).map((l) => ({
            id: l.id,
            label: l.company ? `${l.company} (${l.name})` : l.name,
          }))}
          submitLabel="Guardar cambios"
          defaults={{
            date,
            start: formatTime(block.start_at),
            end: formatTime(block.end_at),
            type: block.type,
            title: block.title,
            content_id: block.content_id,
            lead_id: block.lead_id,
          }}
        />
      </div>
      <form action={deleteBlock.bind(null, block.id, date)}>
        <SubmitButton variant="danger" className="w-full" pendingText="Borrando…">
          Borrar bloque
        </SubmitButton>
      </form>
    </>
  );
}
