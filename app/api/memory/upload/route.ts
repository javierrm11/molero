import { NextResponse } from "next/server";

import { createSource, sourceFromUrl } from "@/lib/memory-create";
import { createClient } from "@/lib/supabase/server";
import { formText } from "@/lib/utils";

// Alta de fuentes en la memoria desde la app: PDF, nota, enlace o libro.
export const maxDuration = 300;

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sesión caducada" }, { status: 401 });
  const userId = auth.user.id;

  const form = await request.formData();
  const mode = formText(form, "mode");
  const inLibrary = form.get("in_library") === "1";

  try {
    if (mode === "pdf") {
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Elige un PDF" }, { status: 400 });
      if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo se admiten PDFs" }, { status: 400 });
      if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "El PDF supera los 25 MB" }, { status: 413 });
      const path = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error } = await supabase.storage.from("memory").upload(path, file, { contentType: "application/pdf" });
      if (error) return NextResponse.json({ error: "No se ha podido subir el PDF" }, { status: 500 });
      const id = await createSource(supabase, userId, {
        kind: "pdf",
        title: file.name.replace(/\.pdf$/i, "") || "Documento",
        filePath: path,
        fileSize: file.size,
      });
      return NextResponse.json({ id });
    }

    if (mode === "note" || mode === "book") {
      const title = formText(form, "title");
      const text = formText(form, "text");
      if (!title || !text) return NextResponse.json({ error: "Pon título y texto" }, { status: 400 });
      const id = await createSource(supabase, userId, {
        kind: mode,
        title,
        body: text.slice(0, 100_000),
        note: mode === "book" ? text.slice(0, 100_000) : null,
        inLibrary: mode === "book" || inLibrary,
        consumedAt: formText(form, "consumed_at") ?? null,
      });
      return NextResponse.json({ id });
    }

    if (mode === "link") {
      const url = formText(form, "url") ?? "";
      const input = sourceFromUrl(url, formText(form, "note"), inLibrary);
      if (!input) return NextResponse.json({ error: "El enlace no es válido" }, { status: 400 });
      const id = await createSource(supabase, userId, { ...input, consumedAt: formText(form, "consumed_at") ?? null });
      return NextResponse.json({ id });
    }
  } catch (error) {
    console.error("[memoria] alta", error);
    return NextResponse.json({ error: "No se ha podido guardar" }, { status: 500 });
  }

  return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
}
