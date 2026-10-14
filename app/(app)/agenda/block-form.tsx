"use client";

import { useActionState, useEffect, useRef } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui/input";
import { BLOCK_TYPE_ORDER, BLOCK_TYPES } from "@/lib/constants";

import type { FormState } from "./actions";

export interface BlockFormDefaults {
  date: string;
  start: string;
  end: string;
  type: string;
  title: string;
  content_id?: string | null;
  lead_id?: string | null;
}

export function BlockForm({
  action,
  defaults,
  contents,
  leads,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  defaults: BlockFormDefaults;
  contents: { id: string; title: string }[];
  leads: { id: string; label: string }[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Field label="Qué toca" htmlFor="b-title">
        <Input id="b-title" name="title" defaultValue={defaults.title} placeholder="Grabar vídeo de la clínica" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" htmlFor="b-type">
          <Select id="b-type" name="type" defaultValue={defaults.type}>
            {BLOCK_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {BLOCK_TYPES[t].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Día" htmlFor="b-date">
          <Input id="b-date" name="date" type="date" defaultValue={defaults.date} required />
        </Field>
        <Field label="Empieza" htmlFor="b-start">
          <Input id="b-start" name="start" type="time" defaultValue={defaults.start} required />
        </Field>
        <Field label="Termina" htmlFor="b-end">
          <Input id="b-end" name="end" type="time" defaultValue={defaults.end} required />
        </Field>
      </div>
      {contents.length > 0 ? (
        <Field label="Contenido (opcional)" htmlFor="b-content" hint="Al terminar el bloque, el contenido avanza en el pipeline.">
          <Select id="b-content" name="content_id" defaultValue={defaults.content_id ?? ""}>
            <option value="">Ninguno</option>
            {contents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {leads.length > 0 ? (
        <Field label="Lead (opcional)" htmlFor="b-lead">
          <Select id="b-lead" name="lead_id" defaultValue={defaults.lead_id ?? ""}>
            <option value="">Ninguno</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? <p className="text-sm font-semibold text-accent">Bloque añadido.</p> : null}
      <SubmitButton pendingText="Guardando…">{submitLabel}</SubmitButton>
    </form>
  );
}
