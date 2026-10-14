"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildContext } from "@/lib/ai/context";
import { aiErrorMessage, generateJson } from "@/lib/ai/gemini";
import { leadMessagePrompt, leadMessageSchema } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { INTERACTION_TYPES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { todayLocal } from "@/lib/dates";
import type { Interaction, Lead, LeadStatus, ProjectStatus } from "@/lib/types";
import {
  clientSchema,
  firstError,
  formToObject,
  interactionSchema,
  leadSchema,
  projectSchema,
  serviceSchema,
} from "@/lib/validations";

export type FormState = { error?: string; ok?: boolean } | undefined;

function revalidateCrm(id?: string) {
  revalidatePath("/crm");
  revalidatePath("/");
  if (id) revalidatePath(`/crm/${id}`);
}

// ── Leads ───────────────────────────────────────────────────

export async function createLead(_: FormState, form: FormData): Promise<FormState> {
  const parsed = leadSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("leads").insert(parsed.data).select("id").single();
  if (error || !data) return { error: "No se ha podido crear el lead." };
  revalidateCrm();
  redirect(`/crm/${data.id}`);
}

export async function updateLead(id: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = leadSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("leads").update(parsed.data).eq("id", id);
  if (error) return { error: "No se ha podido guardar." };
  revalidateCrm(id);
  return { ok: true };
}

export async function setLeadStatus(id: string, status: LeadStatus) {
  if (!(status in LEAD_STATUSES)) return;
  const { supabase } = await requireUser();
  await supabase.from("leads").update({ status }).eq("id", id);
  revalidateCrm(id);
}

/** Marca el seguimiento como hecho: quita la fecha o la mueve unos días. */
export async function postponeFollowUp(id: string, days: number | null) {
  const { supabase } = await requireUser();
  const next = days === null ? null : new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  await supabase.from("leads").update({ follow_up_at: next }).eq("id", id);
  revalidateCrm(id);
}

export async function deleteLead(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("leads").delete().eq("id", id);
  revalidateCrm();
  redirect("/crm");
}

// ── Interacciones ───────────────────────────────────────────

export async function addInteraction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = interactionSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("interactions").insert(parsed.data);
  if (error) return { error: "No se ha podido guardar la interacción." };
  // Un lead nuevo pasa a «contactado» con la primera interacción.
  await supabase.from("leads").update({ status: "contacted" }).eq("id", parsed.data.lead_id).eq("status", "new");
  revalidateCrm(parsed.data.lead_id);
  return { ok: true };
}

export async function deleteInteraction(id: string, leadId: string) {
  const { supabase } = await requireUser();
  await supabase.from("interactions").delete().eq("id", id);
  revalidateCrm(leadId);
}

// ── IA: mensajes ────────────────────────────────────────────

export async function draftLeadMessage(
  id: string,
  kind: "first" | "follow_up",
  extra: string,
): Promise<{ data?: string; error?: string }> {
  try {
    const { supabase } = await requireUser();
    const [{ data: lead }, { data: interactions }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase.from("interactions").select("type, summary, date").eq("lead_id", id).order("date", { ascending: false }).limit(10),
    ]);
    const l = lead as Lead;
    const leadText = [
      `Nombre: ${l.name}`,
      l.company && `Empresa: ${l.company}`,
      l.sector && `Sector: ${l.sector}`,
      l.city && `Ciudad: ${l.city}`,
      l.source && `Origen: ${LEAD_SOURCES[l.source]}`,
      l.service_interest && `Interés: ${l.service_interest}`,
      `Estado: ${LEAD_STATUSES[l.status].label}`,
      l.next_step && `Próximo paso: ${l.next_step}`,
      l.notes && `Notas: ${l.notes}`,
    ]
      .filter(Boolean)
      .join("\n");
    const interactionsText = ((interactions ?? []) as Pick<Interaction, "type" | "summary" | "date">[])
      .map((i) => `- ${i.date} · ${INTERACTION_TYPES[i.type]}: ${i.summary}`)
      .join("\n");

    const result = await generateJson({
      task: "lead_message",
      system: await buildContext("lead_message"),
      prompt: leadMessagePrompt({ kind, lead: leadText, interactions: interactionsText, extra: extra.slice(0, 500) }),
      schema: leadMessageSchema,
    });
    return { data: result.message };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

// ── Clientes y proyectos ────────────────────────────────────

export async function convertToClient(leadId: string) {
  const { supabase } = await requireUser();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  const l = lead as Lead | null;
  if (!l) return;
  const { data: existing } = await supabase.from("clients").select("id").eq("lead_id", leadId).maybeSingle();
  if (!existing) {
    await supabase.from("clients").insert({ lead_id: l.id, name: l.name, company: l.company });
  }
  await supabase.from("leads").update({ status: "won" }).eq("id", leadId);
  revalidateCrm(leadId);
  revalidatePath("/crm/clientes");
  redirect("/crm/clientes");
}

export async function createClientRecord(_: FormState, form: FormData): Promise<FormState> {
  const parsed = clientSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("clients").insert(parsed.data);
  if (error) return { error: "No se ha podido crear el cliente." };
  revalidatePath("/crm/clientes");
  return { ok: true };
}

export async function deleteClientRecord(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/crm/clientes");
}

export async function createProject(_: FormState, form: FormData): Promise<FormState> {
  const parsed = projectSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("projects").insert({ ...parsed.data, start_at: parsed.data.start_at ?? todayLocal() });
  if (error) return { error: "No se ha podido crear el proyecto." };
  revalidatePath("/crm/clientes");
  return { ok: true };
}

export async function setProjectStatus(id: string, status: ProjectStatus) {
  const { supabase } = await requireUser();
  await supabase
    .from("projects")
    .update({ status, ...(status === "delivered" ? { end_at: todayLocal() } : {}) })
    .eq("id", id);
  revalidatePath("/crm/clientes");
}

export async function deleteProject(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/crm/clientes");
}

// ── Servicios ───────────────────────────────────────────────

export async function saveService(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const parsed = serviceSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = id
    ? await supabase.from("services").update(parsed.data).eq("id", id)
    : await supabase.from("services").insert(parsed.data);
  if (error) return { error: "No se ha podido guardar el servicio." };
  revalidatePath("/crm/servicios");
  return { ok: true };
}

export async function toggleService(id: string, active: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("services").update({ active }).eq("id", id);
  revalidatePath("/crm/servicios");
}

export async function deleteService(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/crm/servicios");
}
