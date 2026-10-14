import { Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { PROJECT_STATUSES } from "@/lib/constants";
import { formatShortDate } from "@/lib/dates";
import type { Client, Project, ProjectStatus, Service } from "@/lib/types";
import { initials } from "@/lib/utils";

import { createClientRecord, createProject, deleteClientRecord, deleteProject, setProjectStatus } from "../actions";
import { CrmTabs } from "../crm-tabs";

export const metadata = { title: "Clientes" };

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function ClientsPage() {
  const { supabase } = await requireUser();
  const [{ data: clientsData }, { data: projectsData }, { data: servicesData }] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("projects").select("*").order("start_at", { ascending: false }),
    supabase.from("services").select("id, name").order("name"),
  ]);
  const clients = (clientsData ?? []) as Client[];
  const projects = (projectsData ?? []) as Project[];
  const services = (servicesData ?? []) as Pick<Service, "id" | "name">[];
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const activeTotal = projects.filter((p) => p.status === "active").reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <>
      <header className="flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-semibold text-muted">
          {projects.filter((p) => p.status === "active").length} proyectos en curso · {money.format(activeTotal)}
        </span>
        <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Clientes</h1>
      </header>

      <CrmTabs active="/crm/clientes" />

      {clients.length === 0 ? (
        <EmptyState title="Aún no hay clientes" text="Cuando ganes un lead, conviértelo en cliente desde su ficha o añádelo aquí." />
      ) : (
        clients.map((client) => {
          const own = projects.filter((p) => p.client_id === client.id);
          return (
            <article key={client.id} className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-violet-tint font-extrabold text-violet-ink">
                  {initials(client.company ?? client.name)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="truncate text-[15px] font-extrabold">{client.company ?? client.name}</h2>
                  <span className="truncate text-[13px] text-muted">{[client.company ? client.name : null, client.contact].filter(Boolean).join(" · ")}</span>
                </div>
                <form action={deleteClientRecord.bind(null, client.id)}>
                  <button type="submit" aria-label="Borrar cliente" className="flex size-10 items-center justify-center text-muted">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              </div>

              {own.map((p) => (
                <div key={p.id} className="flex flex-col gap-2 rounded-[18px] bg-bg p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex flex-col">
                      <span className="text-sm font-extrabold">{p.title}</span>
                      <span className="text-xs text-muted">
                        {[p.service_id ? serviceName.get(p.service_id) : null, p.amount !== null ? money.format(p.amount) : "[IMPORTE]"]
                          .filter(Boolean)
                          .join(" · ")}
                        {p.start_at ? ` · desde ${formatShortDate(p.start_at)}` : ""}
                      </span>
                    </span>
                    <Badge tone={PROJECT_STATUSES[p.status].tone} className="bg-card">
                      {PROJECT_STATUSES[p.status].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(PROJECT_STATUSES) as ProjectStatus[])
                      .filter((s) => s !== p.status)
                      .map((s) => (
                        <form key={s} action={setProjectStatus.bind(null, p.id, s)}>
                          <button type="submit" className="h-8 rounded-[10px] bg-card px-2.5 text-xs font-bold">
                            {PROJECT_STATUSES[s].label}
                          </button>
                        </form>
                      ))}
                    <form action={deleteProject.bind(null, p.id)} className="ml-auto">
                      <button type="submit" aria-label="Borrar proyecto" className="flex size-8 items-center justify-center text-muted">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-bold text-accent">
                  <Plus className="size-4" aria-hidden />
                  Nuevo proyecto
                </summary>
                <div className="pt-3">
                  <ActionForm action={createProject} submitLabel="Añadir proyecto" resetOnSuccess submitVariant="tint">
                    <input type="hidden" name="client_id" value={client.id} />
                    <Field label="Proyecto" htmlFor={`p-title-${client.id}`}>
                      <Input id={`p-title-${client.id}`} name="title" required />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Servicio" htmlFor={`p-service-${client.id}`}>
                        <Select id={`p-service-${client.id}`} name="service_id" defaultValue="">
                          <option value="">—</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Importe (€)" htmlFor={`p-amount-${client.id}`}>
                        <Input id={`p-amount-${client.id}`} name="amount" inputMode="decimal" />
                      </Field>
                      <Field label="Inicio" htmlFor={`p-start-${client.id}`}>
                        <Input id={`p-start-${client.id}`} name="start_at" type="date" />
                      </Field>
                      <Field label="Entrega" htmlFor={`p-end-${client.id}`}>
                        <Input id={`p-end-${client.id}`} name="end_at" type="date" />
                      </Field>
                    </div>
                  </ActionForm>
                </div>
              </details>
            </article>
          );
        })
      )}

      <details className="group rounded-[26px] bg-card p-[18px]">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold">
          Nuevo cliente
          <Plus className="size-5 transition-transform group-open:rotate-45" aria-hidden />
        </summary>
        <div className="pt-4">
          <ActionForm action={createClientRecord} submitLabel="Crear cliente" resetOnSuccess successText="Cliente creado.">
            <Field label="Nombre" htmlFor="cl-name">
              <Input id="cl-name" name="name" required />
            </Field>
            <Field label="Empresa" htmlFor="cl-company">
              <Input id="cl-company" name="company" />
            </Field>
            <Field label="Contacto" htmlFor="cl-contact" hint="Email o teléfono.">
              <Input id="cl-contact" name="contact" />
            </Field>
          </ActionForm>
        </div>
      </details>
    </>
  );
}
