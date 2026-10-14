import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { focusOffUrl, focusOnUrl, focusShortcutName } from "@/lib/focus";
import type { Content, Lead, TimeBlock } from "@/lib/types";

import { FocusScreen } from "./focus-screen";

export const metadata = { title: "Modo foco" };

export default async function FocusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data }, settings] = await Promise.all([
    supabase.from("time_blocks").select("*").eq("id", id).maybeSingle(),
    getSettings(supabase),
  ]);
  const block = data as TimeBlock | null;
  if (!block) notFound();

  const [contentRes, leadRes] = await Promise.all([
    block.content_id
      ? supabase.from("contents").select("id, title, hook, script, cta").eq("id", block.content_id).maybeSingle()
      : Promise.resolve({ data: null }),
    block.lead_id
      ? supabase.from("leads").select("id, name, company, next_step, status").eq("id", block.lead_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const content = contentRes.data as Pick<Content, "id" | "title" | "hook" | "script" | "cta"> | null;
  const lead = leadRes.data as Pick<Lead, "id" | "name" | "company" | "next_step"> | null;

  return (
    <FocusScreen
      block={block}
      focusOn={focusOnUrl(settings, block.type)}
      focusOff={focusOffUrl(settings)}
      focusName={settings.focus_enabled ? focusShortcutName(settings, block.type) : null}
      content={content}
      lead={lead ? { id: lead.id, label: lead.company ? `${lead.company} · ${lead.name}` : lead.name, nextStep: lead.next_step } : null}
    />
  );
}
