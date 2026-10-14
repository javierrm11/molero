import { Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { INTERACTION_TYPES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { formatShortDate, todayLocal } from "@/lib/dates";
import type { Interaction, Lead, LeadStatus, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  addInteraction,
  convertToClient,
  deleteInteraction,
  deleteLead,
  postponeFollowUp,
  setLeadStatus,
  updateLead,
} from "../actions";
import { LeadFields } from "../lead-fields";
import { MessageDraft } from "./message-draft";

export const metadata = { title: "Lead" };

const PIPELINE: LeadStatus[] = ["new", "contacted", "interested", "proposal", "won"];

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data }, { data: interactionsData }, { data: servicesData }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("interactions").select("*").eq("lead_id", id).order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("services").select("name").eq("active", true),
  ]);
  const lead = data as Lead | null;
  if (!lead) notFound();
  const interactions = (interactionsData ?? []) as Interaction[];
  const services = ((servicesData ?? []) as Pick<Service, "name">[]).map((s) => s.name);
  const today = todayLocal();

  return (
    <>
      <PageHeader title={lead.company ?? lead.name} eyebrow={lead.company ? lead.name : undefined} back="/crm" />

      <div className="flex flex-wrap gap-1.5 px-1">
        {lead.sector ? <Badge>{lead.sector}</Badge> : null}
        {lead.city ? <Badge>{lead.city}</Badge> : null}
        {lead.source ? <Badge tone="blue">{LEAD_SOURCES[lead.source]}</Badge> : null}
        {lead.service_interest ? <Badge tone="green">{lead.service_interest}</Badge> : null}
      </div>

      <ol aria-label="Estado del lead" className="grid grid-cols-5 gap-1 text-center text-[11px] font-bold">
        {PIPELINE.map((s, i) => {
          const reached = lead.status !== "lost" && PIPELINE.indexOf(lead.status) >= i;
          return (
            <li key={s}>
              <form action={setLeadStatus.bind(null, lead.id, s)}>
                <button
                  type="submit"
                  aria-current={s === lead.status ? "step" : undefined}
                  className={cn(
                    "h-11 w-full rounded-[12px]",
                    s === lead.status ? "bg-accent text-white" : reached ? "bg-accent-tint text-accent-dark" : "bg-card text-muted",
                  )}
                >
                  {LEAD_STATUSES[s].label}
                </button>
              </form>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-3 rounded-[26px] bg-peach-tint p-[18px] text-peach-ink">
        <span className="text-xs font-extrabold">PRÓXIMO PASO</span>
        <p className="text-[17px] font-extrabold">{lead.next_step ?? "Sin definir"}</p>
        <p className="text-sm font-semibold">
          {lead.follow_up_at
            ? `Seguimiento: ${formatShortDate(lead.follow_up_at)}${lead.follow_up_at < today ? " (atrasado)" : lead.follow_up_at === today ? " (hoy)" : ""}`
            : "Sin fecha de seguimiento"}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            [3, "+3 días"],
            [7, "+1 semana"],
          ].map(([days, label]) => (
            <form key={label} action={postponeFollowUp.bind(null, lead.id, days as number)}>
              <Button type="submit" variant="white" size="sm">
                {label}
              </Button>
            </form>
          ))}
          {lead.follow_up_at ? (
            <form action={postponeFollowUp.bind(null, lead.id, null)}>
              <Button type="submit" variant="white" size="sm">
                Quitar fecha
              </Button>
            </form>
          ) : null}
        </div>
      </section>

      <MessageDraft leadId={lead.id} hasInteractions={interactions.length > 0} />

      <section aria-labelledby="interacciones" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
        <h2 id="interacciones" className="text-base font-extrabold">
          Interacciones
        </h2>
        {interactions.length > 0 ? (
          <ul className="flex flex-col">
            {interactions.map((it, i) => (
              <li key={it.id} className={cn("flex items-start gap-3 py-2.5", i > 0 && "border-t border-line")}>
                <span className="w-16 shrink-0 text-xs font-bold text-muted">{formatShortDate(it.date)}</span>
                <span className="flex-1 text-sm">
                  <strong className="font-extrabold">{INTERACTION_TYPES[it.type]}</strong> · {it.summary}
                </span>
                <form action={deleteInteraction.bind(null, it.id, lead.id)}>
                  <button type="submit" aria-label="Borrar interacción" className="flex size-8 items-center justify-center text-muted">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Todavía no hay interacciones.</p>
        )}
        <ActionForm action={addInteraction} submitLabel="Registrar" resetOnSuccess submitVariant="tint">
          <input type="hidden" name="lead_id" value={lead.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" htmlFor="i-type">
              <Select id="i-type" name="type" defaultValue="message">
                {Object.entries(INTERACTION_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha" htmlFor="i-date">
              <Input id="i-date" name="date" type="date" defaultValue={today} required />
            </Field>
          </div>
          <Field label="Resumen" htmlFor="i-summary">
            <Input id="i-summary" name="summary" placeholder="Les interesa la reserva online" required />
          </Field>
        </ActionForm>
      </section>

      {lead.status === "proposal" || lead.status === "won" ? (
        <form action={convertToClient.bind(null, lead.id)}>
          <SubmitButton size="lg" className="w-full" pendingText="Creando cliente…">
            {lead.status === "won" ? "Crear ficha de cliente" : "Ganado: convertir en cliente"}
          </SubmitButton>
        </form>
      ) : null}

      <details className="rounded-[26px] bg-card p-[18px]">
        <summary className="cursor-pointer list-none text-base font-extrabold">Editar datos</summary>
        <div className="pt-4">
          <ActionForm action={updateLead.bind(null, lead.id)} submitLabel="Guardar cambios" successText="Guardado.">
            <LeadFields lead={lead} services={services} />
          </ActionForm>
        </div>
      </details>

      <form action={deleteLead.bind(null, lead.id)}>
        <SubmitButton variant="danger" className="w-full" pendingText="Borrando…">
          Borrar lead
        </SubmitButton>
      </form>
    </>
  );
}
