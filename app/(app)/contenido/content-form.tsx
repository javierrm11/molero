"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CONTENT_STATUS_ORDER, CONTENT_STATUSES, FORMATS, PILLARS, PLATFORMS } from "@/lib/constants";
import type { Content } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { FormState } from "./actions";

export function ContentForm({
  action,
  content,
  full = false,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  content?: Partial<Content>;
  full?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Título" htmlFor="c-title">
        <Input id="c-title" name="title" defaultValue={content?.title ?? ""} placeholder="Qué es una API, con un camarero" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pilar" htmlFor="c-pillar">
          <Select id="c-pillar" name="pillar" defaultValue={content?.pillar ?? ""}>
            <option value="">Sin pilar</option>
            {Object.entries(PILLARS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Formato" htmlFor="c-format">
          <Select id="c-format" name="format" defaultValue={content?.format ?? ""}>
            <option value="">Sin formato</option>
            {Object.entries(FORMATS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="px-1 pb-1.5 text-[13px] font-bold text-muted">Plataformas</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PLATFORMS).map(([value, label]) => (
            <label key={value} className="has-[:checked]:bg-accent has-[:checked]:text-white flex h-10 cursor-pointer items-center rounded-[20px] bg-bg px-3.5 text-[13px] font-bold">
              <input
                type="checkbox"
                name="platforms"
                value={value}
                defaultChecked={content?.platforms?.includes(value as never)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={cn("grid gap-3", full ? "grid-cols-2" : "grid-cols-1")}>
        <Field label="Fecha prevista" htmlFor="c-planned">
          <Input id="c-planned" name="planned_at" type="date" defaultValue={content?.planned_at ?? ""} />
        </Field>
        {full ? (
          <Field label="Estado" htmlFor="c-status">
            <Select id="c-status" name="status" defaultValue={content?.status ?? "idea"}>
              {CONTENT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {CONTENT_STATUSES[s]}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="status" value="idea" />
        )}
      </div>
      {full ? (
        <>
          <Field label="Serie" htmlFor="c-series">
            <Input id="c-series" name="series" defaultValue={content?.series ?? ""} />
          </Field>
          <Field label="Hook" htmlFor="c-hook">
            <Textarea id="c-hook" name="hook" rows={2} defaultValue={content?.hook ?? ""} />
          </Field>
          <Field label="Guion" htmlFor="c-script">
            <Textarea id="c-script" name="script" rows={8} defaultValue={content?.script ?? ""} />
          </Field>
          <Field label="CTA" htmlFor="c-cta">
            <Textarea id="c-cta" name="cta" rows={2} defaultValue={content?.cta ?? ""} />
          </Field>
          <Field label="Fecha publicada" htmlFor="c-published">
            <Input id="c-published" name="published_at" type="date" defaultValue={content?.published_at ?? ""} />
          </Field>
        </>
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? <p className="text-sm font-semibold text-accent">Guardado.</p> : null}
      <SubmitButton pendingText="Guardando…">{submitLabel}</SubmitButton>
    </form>
  );
}
