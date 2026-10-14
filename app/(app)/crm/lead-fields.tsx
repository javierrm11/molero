import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { LEAD_SOURCES, LEAD_STATUS_ORDER, LEAD_STATUSES } from "@/lib/constants";
import type { Lead } from "@/lib/types";

export function LeadFields({ lead, services }: { lead?: Partial<Lead>; services: string[] }) {
  return (
    <>
      <Field label="Nombre de contacto" htmlFor="l-name">
        <Input id="l-name" name="name" defaultValue={lead?.name ?? ""} required />
      </Field>
      <Field label="Empresa" htmlFor="l-company">
        <Input id="l-company" name="company" defaultValue={lead?.company ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sector" htmlFor="l-sector">
          <Input id="l-sector" name="sector" defaultValue={lead?.sector ?? ""} />
        </Field>
        <Field label="Ciudad" htmlFor="l-city">
          <Input id="l-city" name="city" defaultValue={lead?.city ?? ""} />
        </Field>
        <Field label="Origen" htmlFor="l-source">
          <Select id="l-source" name="source" defaultValue={lead?.source ?? ""}>
            <option value="">—</option>
            {Object.entries(LEAD_SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado" htmlFor="l-status">
          <Select id="l-status" name="status" defaultValue={lead?.status ?? "new"}>
            {LEAD_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUSES[s].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Servicio de interés" htmlFor="l-service">
        <Input id="l-service" name="service_interest" list="servicios" defaultValue={lead?.service_interest ?? ""} />
        <datalist id="servicios">
          {services.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Próximo paso" htmlFor="l-next">
          <Input id="l-next" name="next_step" defaultValue={lead?.next_step ?? ""} placeholder="Enviar propuesta" />
        </Field>
        <Field label="Seguimiento" htmlFor="l-follow">
          <Input id="l-follow" name="follow_up_at" type="date" defaultValue={lead?.follow_up_at ?? ""} className="w-[150px]" />
        </Field>
      </div>
      <Field label="Notas" htmlFor="l-notes">
        <Textarea id="l-notes" name="notes" rows={3} defaultValue={lead?.notes ?? ""} />
      </Field>
    </>
  );
}
