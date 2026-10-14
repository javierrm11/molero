import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import type { CaptureAi } from "@/lib/ai/prompts";
import { requireUser } from "@/lib/auth";
import { describeCapture } from "@/lib/captures";
import { BLOCK_TYPE_ORDER, BLOCK_TYPES, CAPTURE_TYPES } from "@/lib/constants";
import { formatShortDate, formatTime, toLocalDate, todayLocal } from "@/lib/dates";
import type { Capture } from "@/lib/types";

import { captureToBlock, captureToContent, captureToLead, deleteCapture, discardCapture } from "./actions";

export const metadata = { title: "Bandeja" };

function plusHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(Math.min((h ?? 0) + 1, 23)).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("captures").select("*").eq("processed", false).order("created_at", { ascending: false });
  const captures = (data ?? []) as (Capture & { ai: Partial<CaptureAi> })[];

  const audioUrls = new Map<string, string>();
  const withAudio = captures.filter((c) => c.audio_url);
  if (withAudio.length > 0) {
    const { data: signed } = await supabase.storage.from("captures").createSignedUrls(
      withAudio.map((c) => c.audio_url!),
      3600,
    );
    signed?.forEach((s, i) => {
      const capture = withAudio[i];
      if (s.signedUrl && capture) audioUrls.set(capture.id, s.signedUrl);
    });
  }
  const today = todayLocal();

  return (
    <>
      <PageHeader title="Bandeja" eyebrow={`${captures.length} sin procesar`} back={from === "revision" ? "/revision?paso=2" : "/"} />

      {captures.length === 0 ? (
        <EmptyState title="Bandeja vacía" text="Todo procesado. Usa el botón + para capturar ideas, leads o tareas al vuelo.">
          {from === "revision" ? (
            <Link href="/revision?paso=3" className="mt-2 rounded-[14px] bg-accent px-4 py-2.5 text-sm font-bold text-white">
              Seguir con la revisión
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        captures.map((c) => {
          const lines = describeCapture(c.ai as CaptureAi);
          const created = new Date(c.created_at);
          const task = c.ai.task;
          const start = task?.time && /^\d{2}:\d{2}$/.test(task.time) ? task.time : "17:00";
          return (
            <article key={c.id} className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
              <div className="flex items-center justify-between">
                <Badge tone={CAPTURE_TYPES[c.type].tone}>
                  {CAPTURE_TYPES[c.type].label}
                  {c.audio_url ? " · voz" : ""}
                </Badge>
                <span className="text-xs font-bold text-muted">
                  {formatShortDate(toLocalDate(created))} · {formatTime(c.created_at)}
                </span>
              </div>
              <h2 className="text-lg leading-snug font-extrabold">{c.title ?? "Sin título"}</h2>
              {c.raw_text && c.raw_text !== c.title ? <p className="text-sm text-muted">“{c.raw_text}”</p> : null}
              {audioUrls.get(c.id) ? <audio controls preload="none" src={audioUrls.get(c.id)} className="w-full" /> : null}
              {lines.length > 0 ? (
                <ul className="flex flex-col gap-1 rounded-[16px] bg-bg p-3 text-[13px]">
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}

              {c.type === "task" ? (
                <details open>
                  <summary className="cursor-pointer list-none text-[13px] font-bold text-accent">Añadir a la agenda</summary>
                  <div className="pt-3">
                    <ActionForm action={captureToBlock.bind(null, c.id)} submitLabel="Añadir a la agenda">
                      <Field label="Qué" htmlFor={`t-${c.id}`}>
                        <Input id={`t-${c.id}`} name="title" defaultValue={c.title ?? ""} required />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Tipo" htmlFor={`ty-${c.id}`}>
                          <Select id={`ty-${c.id}`} name="type" defaultValue={task?.block_type ?? "admin"}>
                            {BLOCK_TYPE_ORDER.map((t) => (
                              <option key={t} value={t}>
                                {BLOCK_TYPES[t].label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Día" htmlFor={`d-${c.id}`}>
                          <Input
                            id={`d-${c.id}`}
                            name="date"
                            type="date"
                            defaultValue={task?.date && /^\d{4}-\d{2}-\d{2}$/.test(task.date) ? task.date : today}
                            required
                          />
                        </Field>
                        <Field label="Empieza" htmlFor={`s-${c.id}`}>
                          <Input id={`s-${c.id}`} name="start" type="time" defaultValue={start} required />
                        </Field>
                        <Field label="Termina" htmlFor={`e-${c.id}`}>
                          <Input id={`e-${c.id}`} name="end" type="time" defaultValue={plusHour(start)} required />
                        </Field>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {c.type === "context" ? (
                  <Link href={`/cerebro?nota=${c.id}`} className="flex h-10 items-center rounded-[14px] bg-accent px-3.5 text-[13px] font-bold text-white">
                    Actualizar Cerebro
                  </Link>
                ) : null}
                {c.type !== "task" ? (
                  <>
                    <form action={captureToContent.bind(null, c.id)}>
                      <SubmitButton size="sm" variant={c.type === "idea" ? "primary" : "soft"}>
                        Crear contenido
                      </SubmitButton>
                    </form>
                    <form action={captureToLead.bind(null, c.id)}>
                      <SubmitButton size="sm" variant={c.type === "lead" ? "primary" : "soft"}>
                        Crear lead
                      </SubmitButton>
                    </form>
                  </>
                ) : null}
                <form action={discardCapture.bind(null, c.id)}>
                  <SubmitButton size="sm" variant="soft">
                    Archivar
                  </SubmitButton>
                </form>
                <form action={deleteCapture.bind(null, c.id)}>
                  <SubmitButton size="sm" variant="danger">
                    Borrar
                  </SubmitButton>
                </form>
              </div>
            </article>
          );
        })
      )}
    </>
  );
}
