"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { todayLocal } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Mode = "pdf" | "note" | "link" | "book";

const LABELS: Record<Mode, string> = { pdf: "PDF", note: "Nota", link: "Enlace", book: "Libro" };

/** Alta de fuentes: PDF, nota, enlace (web, YouTube, TikTok…) o libro. */
export function AddSource({ library = false }: { library?: boolean }) {
  const router = useRouter();
  const modes: Mode[] = library ? ["link", "book", "note"] : ["pdf", "note", "link"];
  const [mode, setMode] = useState<Mode>(modes[0]!);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(form: FormData) {
    setPending(true);
    setMessage(null);
    form.set("mode", mode);
    if (library) form.set("in_library", "1");
    try {
      const res = await fetch("/api/memory/upload", { method: "POST", body: form });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se ha podido guardar");
      formRef.current?.reset();
      setMessage({ ok: true, text: "Guardado. La IA lo está procesando." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "No se ha podido guardar" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="anadir" className="flex flex-col gap-3 rounded-[26px] bg-card p-[18px]">
      <h2 id="anadir" className="text-base font-extrabold">
        {library ? "Añadir a la biblioteca" : "Añadir a la memoria"}
      </h2>
      <div role="tablist" aria-label="Tipo" className={cn("grid gap-1 rounded-[16px] bg-bg p-1 text-[13px] font-bold", "grid-cols-3")}>
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("h-10 rounded-[12px]", mode === m ? "bg-card shadow-sm" : "text-muted")}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      <form ref={formRef} action={submit} className="flex flex-col gap-3">
        {mode === "pdf" ? (
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed border-[#9BB3A8] text-sm font-extrabold text-accent-dark">
            <Upload className="size-5" aria-hidden />
            Elige un PDF (máx. 25 MB)
            <input type="file" name="file" accept="application/pdf" required className="sr-only" />
          </label>
        ) : null}

        {mode === "note" || mode === "book" ? (
          <>
            <Field label={mode === "book" ? "Libro" : "Título"} htmlFor="src-title">
              <Input id="src-title" name="title" required placeholder={mode === "book" ? "Hábitos atómicos" : "Ideas para CitasWassap"} />
            </Field>
            <Field label={mode === "book" ? "Tus notas del libro" : "Texto"} htmlFor="src-text">
              <Textarea id="src-text" name="text" rows={5} required />
            </Field>
          </>
        ) : null}

        {mode === "link" ? (
          <>
            <Field label="Enlace" htmlFor="src-url" hint="Web, artículo, YouTube, TikTok o Instagram.">
              <Input id="src-url" name="url" type="url" inputMode="url" required placeholder="https://" />
            </Field>
            <Field label="Tu nota (opcional)" htmlFor="src-note">
              <Textarea id="src-note" name="note" rows={2} />
            </Field>
          </>
        ) : null}

        {library && mode !== "note" ? (
          <Field label="Cuándo lo viste o leíste" htmlFor="src-date">
            <Input id="src-date" name="consumed_at" type="date" defaultValue={todayLocal()} />
          </Field>
        ) : null}

        {message ? (
          <p role={message.ok ? "status" : "alert"} className={cn("text-sm font-semibold", message.ok ? "text-accent" : "text-danger")}>
            {message.text}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Subiendo…" : "Guardar"}
        </Button>
      </form>
    </section>
  );
}
