import { z } from "zod";

import { BLOCK_TYPE_ORDER, FORMATS, INTERACTION_TYPES, LEAD_SOURCES, PILLARS, PLATFORMS, PROJECT_STATUSES } from "@/lib/constants";

// Esquemas de validación de los formularios (se usan en las server actions).

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v),
  z.string().max(10000).nullable().optional(),
);
const optionalDate = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
);
const optionalMoney = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(String(v).replace(",", "."))),
  z.number().nonnegative().nullable().optional(),
);
const keysOf = <T extends Record<string, unknown>>(record: T) => Object.keys(record) as [keyof T & string, ...(keyof T & string)[]];
const optionalEnum = <T extends Record<string, unknown>>(record: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(keysOf(record)).nullable().optional());

export const contentSchema = z.object({
  title: z.string().trim().min(1, "Pon un título").max(200),
  pillar: optionalEnum(PILLARS),
  series: optionalText,
  format: optionalEnum(FORMATS),
  platforms: z.array(z.enum(keysOf(PLATFORMS))).default([]),
  status: z.enum(["idea", "script", "recorded", "edited", "published"]).default("idea"),
  hook: optionalText,
  script: optionalText,
  cta: optionalText,
  planned_at: optionalDate,
  published_at: optionalDate,
});

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Pon un nombre").max(200),
  company: optionalText,
  sector: optionalText,
  city: optionalText,
  source: optionalEnum(LEAD_SOURCES),
  service_interest: optionalText,
  status: z.enum(["new", "contacted", "interested", "proposal", "won", "lost"]).default("new"),
  next_step: optionalText,
  follow_up_at: optionalDate,
  notes: optionalText,
});

export const interactionSchema = z.object({
  lead_id: z.uuid(),
  type: z.enum(keysOf(INTERACTION_TYPES)),
  summary: z.string().trim().min(1, "Resume la interacción").max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  price_from: optionalMoney,
  price_to: optionalMoney,
});

export const clientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  company: optionalText,
  contact: optionalText,
});

export const projectSchema = z.object({
  client_id: z.uuid(),
  service_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable().optional()),
  title: z.string().trim().min(1).max(200),
  amount: optionalMoney,
  status: z.enum(keysOf(PROJECT_STATUSES)).default("active"),
  start_at: optionalDate,
  end_at: optionalDate,
});

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Hora no válida");

export const blockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: hhmm,
    end: hhmm,
    type: z.enum(BLOCK_TYPE_ORDER as [string, ...string[]]),
    title: z.string().trim().min(1, "Pon un título").max(200),
    content_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable().optional()),
    lead_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable().optional()),
  })
  .refine((b) => b.end > b.start, { message: "La hora de fin tiene que ser posterior al inicio", path: ["end"] });

/** Pasa un FormData a objeto, agrupando en arrays los campos indicados. */
export function formToObject(form: FormData, arrayFields: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = arrayFields.includes(key) ? form.getAll(key) : form.get(key);
  }
  for (const key of arrayFields) out[key] ??= [];
  return out;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos no válidos";
}
