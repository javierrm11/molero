import { Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { ensureServices } from "@/lib/data";
import type { Service } from "@/lib/types";
import { cn } from "@/lib/utils";

import { deleteService, saveService, toggleService } from "../actions";
import { CrmTabs } from "../crm-tabs";

export const metadata = { title: "Servicios" };

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function priceRange(s: Service): string {
  if (s.price_from === null && s.price_to === null) return "[RANGO]";
  if (s.price_to === null) return `desde ${money.format(s.price_from ?? 0)}`;
  if (s.price_from === null) return `hasta ${money.format(s.price_to)}`;
  return `${money.format(s.price_from)} – ${money.format(s.price_to)}`;
}

function ServiceFields({ service }: { service?: Service }) {
  const key = service?.id ?? "new";
  return (
    <>
      <Field label="Nombre" htmlFor={`s-name-${key}`}>
        <Input id={`s-name-${key}`} name="name" defaultValue={service?.name ?? ""} required />
      </Field>
      <Field label="Qué incluye" htmlFor={`s-desc-${key}`}>
        <Textarea id={`s-desc-${key}`} name="description" rows={3} defaultValue={service?.description ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde (€)" htmlFor={`s-from-${key}`}>
          <Input id={`s-from-${key}`} name="price_from" inputMode="decimal" defaultValue={service?.price_from ?? ""} />
        </Field>
        <Field label="Hasta (€)" htmlFor={`s-to-${key}`}>
          <Input id={`s-to-${key}`} name="price_to" inputMode="decimal" defaultValue={service?.price_to ?? ""} />
        </Field>
      </div>
    </>
  );
}

export default async function ServicesPage() {
  const { supabase } = await requireUser();
  await ensureServices(supabase);
  const { data } = await supabase.from("services").select("*").order("created_at");
  const services = (data ?? []) as Service[];

  return (
    <>
      <header className="flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-semibold text-muted">Catálogo · lo usa la IA en propuestas y mensajes</span>
        <h1 className="text-[26px] font-extrabold tracking-[-0.6px]">Servicios</h1>
      </header>

      <CrmTabs active="/crm/servicios" />

      {services.map((s) => (
        <article key={s.id} className={cn("flex flex-col gap-2 rounded-[26px] bg-card p-[18px]", !s.active && "opacity-60")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-extrabold">{s.name}</h2>
              <span className="text-sm font-bold text-accent">{priceRange(s)}</span>
            </div>
            <div className="flex gap-1">
              <form action={toggleService.bind(null, s.id, !s.active)}>
                <Button type="submit" variant="soft" size="sm">
                  {s.active ? "Desactivar" : "Activar"}
                </Button>
              </form>
              <form action={deleteService.bind(null, s.id)}>
                <Button type="submit" variant="ghost" size="icon" aria-label="Borrar servicio" className="size-10">
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </form>
            </div>
          </div>
          {s.description ? <p className="text-sm text-muted">{s.description}</p> : null}
          <details>
            <summary className="cursor-pointer list-none text-[13px] font-bold text-accent">Editar</summary>
            <div className="pt-3">
              <ActionForm action={saveService.bind(null, s.id)} submitLabel="Guardar" successText="Guardado." submitVariant="tint">
                <ServiceFields service={s} />
              </ActionForm>
            </div>
          </details>
        </article>
      ))}

      <details className="group rounded-[26px] bg-card p-[18px]">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-extrabold">
          Nuevo servicio
          <Plus className="size-5 transition-transform group-open:rotate-45" aria-hidden />
        </summary>
        <div className="pt-4">
          <ActionForm action={saveService.bind(null, null)} submitLabel="Añadir servicio" resetOnSuccess successText="Servicio añadido.">
            <ServiceFields />
          </ActionForm>
        </div>
      </details>
    </>
  );
}
