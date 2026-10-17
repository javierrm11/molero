import "server-only";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { detectKind, ingestSource, isValidUrl } from "@/lib/memory";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { todayLocal } from "@/lib/dates";
import type { MemoryKind } from "@/lib/types";

// Alta de fuentes en la memoria, compartida por la subida desde la app y el atajo «Guardar en Molero».

export interface NewSource {
  kind: MemoryKind;
  title: string;
  url?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  body?: string | null;
  note?: string | null;
  inLibrary?: boolean;
  consumedAt?: string | null;
}

/** Crea la fuente y la procesa en segundo plano (o en el momento si no hay service role). */
export async function createSource(client: SupabaseClient, userId: string, input: NewSource): Promise<string> {
  const { data, error } = await client
    .from("memory_sources")
    .insert({
      user_id: userId,
      kind: input.kind,
      title: input.title.slice(0, 300),
      url: input.url ?? null,
      file_path: input.filePath ?? null,
      file_size: input.fileSize ?? null,
      body: input.body ?? null,
      user_note: input.note ?? null,
      in_library: input.inLibrary ?? false,
      consumed_at: input.inLibrary ? (input.consumedAt ?? todayLocal()) : null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("No se ha podido guardar la fuente");

  if (hasAdminKey()) {
    const admin = createAdminClient();
    after(() => ingestSource({ client: admin, userId }, data.id));
  } else {
    await ingestSource({ client, userId }, data.id);
  }
  return data.id as string;
}

/** Fuente a partir de un enlace (web, YouTube, TikTok, Instagram). */
export function sourceFromUrl(url: string, note?: string | null, inLibrary = true): NewSource | null {
  if (!isValidUrl(url)) return null;
  const kind = detectKind(url);
  return { kind: kind === "web" && inLibrary ? "article" : kind, title: url, url, note: note ?? null, inLibrary };
}
