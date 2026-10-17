import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

import { buildContext } from "@/lib/ai/context";
import { AiError, aiErrorMessage, embed, generate, generateJson, type ServerScope } from "@/lib/ai/gemini";
import { answerPrompt, answerSchema, ingestPrompt, ingestSchema, ocrPrompt, VIDEO_PROMPT, videoSchema } from "@/lib/ai/prompts";
import { MEMORY_KINDS } from "@/lib/constants";
import type { MemoryKind, MemoryMatch, MemorySource } from "@/lib/types";

// Segundo cerebro y biblioteca: cada fuente se convierte en texto, se trocea, se indexa con embeddings
// (pgvector) y se resume. Las preguntas buscan los fragmentos más parecidos y Gemini responde citándolos.

const MAX_TEXT = 400_000;
const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

export function detectKind(url: string): MemoryKind {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host.endsWith("instagram.com")) return "instagram";
  return "web";
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Trocea texto (por páginas si las hay) en fragmentos con solape, cortando en párrafos o frases. */
export function chunkPages(pages: { text: string; page: number | null }[]): { content: string; page: number | null }[] {
  const chunks: { content: string; page: number | null }[] = [];
  for (const { text, page } of pages) {
    const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    let start = 0;
    while (start < clean.length) {
      let end = Math.min(start + CHUNK_SIZE, clean.length);
      if (end < clean.length) {
        const slice = clean.slice(start, end);
        const cut = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
        if (cut > CHUNK_SIZE * 0.5) end = start + cut + 1;
      }
      const content = clean.slice(start, end).trim();
      if (content.length > 40) chunks.push({ content, page });
      if (end >= clean.length) break;
      start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }
  }
  return chunks;
}

function htmlToText(html: string): { title: string | null; text: string } {
  const title =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] ??
    null;
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n");
  return { title: title?.trim() ?? null, text: body.trim() };
}

async function fetchPage(url: string): Promise<{ title: string | null; text: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (MoleroHQ; lector personal)" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`La web respondió ${res.status}`);
  const html = (await res.text()).slice(0, 3_000_000);
  return htmlToText(html);
}

async function oembedTitle(url: string, kind: MemoryKind): Promise<string | null> {
  const endpoint = kind === "tiktok" ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` : null;
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string; author_name?: string };
    return json.title ? `${json.title}${json.author_name ? ` · @${json.author_name}` : ""}` : null;
  } catch {
    return null;
  }
}

async function pdfPages(scope: ServerScope, source: MemorySource): Promise<{ text: string; page: number | null }[]> {
  if (!source.file_path) throw new Error("El PDF no tiene archivo");
  const { data, error } = await scope.client.storage.from("memory").download(source.file_path);
  if (error || !data) throw new Error("No se ha podido leer el PDF");
  const bytes = new Uint8Array(await data.arrayBuffer());
  const pdf = await getDocumentProxy(bytes.slice());
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  const pages = text.map((t, i) => ({ text: t, page: i + 1 }));
  const chars = pages.reduce((s, p) => s + p.text.trim().length, 0);
  if (chars > 200 * Math.min(totalPages, 3)) return pages;

  // PDF escaneado: Gemini hace el OCR.
  if (bytes.byteLength > 18 * 1024 * 1024) throw new Error("El PDF escaneado es demasiado grande para leerlo con IA.");
  const ocr = await generate({
    task: "memory_ingest",
    tier: "lite",
    scope,
    system: "Eres un OCR preciso.",
    prompt: ocrPrompt,
    attachments: [{ mimeType: "application/pdf", base64: Buffer.from(bytes).toString("base64") }],
  });
  return ocr
    .split(/---\s*p[áa]gina\s*(\d+)\s*---/i)
    .reduce<{ text: string; page: number | null }[]>((acc, part, i, arr) => {
      if (i % 2 === 1) acc.push({ page: Number(part), text: arr[i + 1] ?? "" });
      else if (i === 0 && part.trim()) acc.push({ page: 1, text: part });
      return acc;
    }, []);
}

/** Procesa una fuente: texto → resumen → fragmentos → embeddings. Pensado para ejecutarse en segundo plano. */
export async function ingestSource(scope: ServerScope, sourceId: string): Promise<void> {
  const { client, userId } = scope;
  const { data } = await client.from("memory_sources").select("*").eq("id", sourceId).eq("user_id", userId).single();
  const source = data as MemorySource | null;
  if (!source) return;
  await client.from("memory_sources").update({ status: "processing", error: null }).eq("id", sourceId);

  try {
    let title = source.title;
    let pages: { text: string; page: number | null }[] = [];
    let summary: string | null = null;
    let keyPoints: string[] = [];
    let topics: string[] = [];
    const meta: MemorySource["meta"] = { ...source.meta };
    let body = source.body;

    if (source.kind === "pdf") {
      pages = await pdfPages(scope, source);
      meta.pages = pages.length;
    } else if (source.kind === "youtube" && source.url) {
      const video = await generateJson({
        task: "memory_ingest",
        tier: "lite",
        scope,
        system: "Eres un tomador de apuntes excelente.",
        prompt: VIDEO_PROMPT,
        attachments: [{ fileUri: source.url }],
        schema: videoSchema,
      });
      title = video.title || title;
      summary = video.summary;
      keyPoints = video.key_points;
      topics = video.topics;
      meta.channel = video.channel ?? undefined;
      meta.duration = video.duration ?? undefined;
      body = video.notes;
      pages = [{ text: `${video.summary}\n\n${video.key_points.join("\n")}\n\n${video.notes}`, page: null }];
    } else if ((source.kind === "web" || source.kind === "article") && source.url) {
      const page = await fetchPage(source.url);
      title = page.title ?? title;
      body = page.text.slice(0, MAX_TEXT);
      pages = [{ text: body, page: null }];
    } else if ((source.kind === "tiktok" || source.kind === "instagram") && source.url) {
      title = (await oembedTitle(source.url, source.kind)) ?? title;
      body = source.user_note ?? title;
      pages = [{ text: `${title}\n\n${source.user_note ?? ""}`, page: null }];
    } else {
      // Notas y libros: el texto lo escribe Javier.
      pages = [{ text: body ?? source.user_note ?? "", page: null }];
    }

    const fullText = pages.map((p) => p.text).join("\n\n").slice(0, MAX_TEXT);
    if (fullText.trim().length < 20) throw new AiError("No hay texto suficiente para indexar.");
    meta.words = fullText.split(/\s+/).filter(Boolean).length;

    if (!summary) {
      const ai = await generateJson({
        task: "memory_ingest",
        tier: "lite",
        scope,
        system: "Eres un asistente que resume fuentes para una memoria personal.",
        prompt: ingestPrompt(MEMORY_KINDS[source.kind].label, fullText.slice(0, 60_000)),
        schema: ingestSchema,
      });
      if (source.kind !== "note" && source.kind !== "book") title = source.title === source.url || !source.title ? ai.title : title;
      summary = ai.summary;
      keyPoints = ai.key_points;
      topics = ai.topics;
    }

    const chunks = chunkPages(pages).slice(0, 1500);
    const vectors = await embed(
      chunks.map((c) => c.content),
      "document",
      { title, scope },
    );
    await client.from("memory_chunks").delete().eq("source_id", sourceId).eq("user_id", userId);
    for (let i = 0; i < chunks.length; i += 100) {
      const { error } = await client.from("memory_chunks").insert(
        chunks.slice(i, i + 100).map((c, j) => ({
          user_id: userId,
          source_id: sourceId,
          idx: i + j,
          page: c.page,
          content: c.content,
          embedding: vectors[i + j],
        })),
      );
      if (error) throw error;
    }
    meta.chunks = chunks.length;

    await client
      .from("memory_sources")
      .update({
        status: "ready",
        title: title.slice(0, 300),
        summary,
        key_points: keyPoints,
        topics,
        meta,
        body: source.kind === "pdf" ? null : body,
      })
      .eq("id", sourceId);
  } catch (error) {
    console.error("[memoria] error al procesar", sourceId, error);
    const message = error instanceof AiError ? aiErrorMessage(error) : error instanceof Error ? error.message : "Error desconocido";
    await client.from("memory_sources").update({ status: "error", error: message.slice(0, 300) }).eq("id", sourceId);
  }
}

export interface AnswerSource {
  n: number;
  sourceId: string;
  title: string;
  kind: MemoryKind;
  page: number | null;
}

export async function askMemory(
  scope: ServerScope,
  question: string,
  sourceId: string | null = null,
): Promise<{ answer: string; sources: AnswerSource[] }> {
  const [vector] = await embed([question], "query", { scope });
  const { data, error } = await scope.client.rpc("match_memory_chunks", {
    query_embedding: vector,
    match_count: 8,
    p_source: sourceId,
    p_user: scope.userId,
  });
  if (error) throw error;
  const matches = ((data ?? []) as MemoryMatch[]).filter((m) => m.similarity > 0.3);
  if (matches.length === 0) {
    return { answer: "No encuentro nada sobre eso en tu memoria. Sube un PDF, una nota o un enlace que lo trate.", sources: [] };
  }

  const ids = [...new Set(matches.map((m) => m.source_id))];
  const { data: sourcesData } = await scope.client.from("memory_sources").select("id, title, kind").in("id", ids).eq("user_id", scope.userId);
  const sourceMap = new Map(((sourcesData ?? []) as Pick<MemorySource, "id" | "title" | "kind">[]).map((s) => [s.id, s]));

  const fragments = matches
    .map((m, i) => `[${i + 1}] (${sourceMap.get(m.source_id)?.title ?? "fuente"}${m.page ? `, pág. ${m.page}` : ""})\n${m.content}`)
    .join("\n\n");
  const result = await generateJson({
    task: "memory_answer",
    tier: "fast",
    scope,
    system: await buildContext("memory_answer", { scope }),
    prompt: answerPrompt(question, fragments),
    schema: answerSchema,
  });

  const cited = [...new Set(result.citations)].filter((n) => n >= 1 && n <= matches.length).sort((a, b) => a - b);
  const sources = cited.map((n) => {
    const m = matches[n - 1]!;
    const s = sourceMap.get(m.source_id);
    return { n, sourceId: m.source_id, title: s?.title ?? "Fuente", kind: s?.kind ?? "note", page: m.page };
  });
  return { answer: result.answer, sources };
}

/** Otras fuentes de la memoria parecidas a esta (por el primer fragmento). */
export async function relatedSources(scope: ServerScope, sourceId: string): Promise<Pick<MemorySource, "id" | "title" | "kind">[]> {
  const { data: first } = await scope.client
    .from("memory_chunks")
    .select("embedding")
    .eq("source_id", sourceId)
    .eq("user_id", scope.userId)
    .order("idx")
    .limit(1)
    .maybeSingle();
  if (!first?.embedding) return [];
  const { data } = await scope.client.rpc("match_memory_chunks", {
    query_embedding: first.embedding,
    match_count: 12,
    p_source: null,
    p_user: scope.userId,
  });
  const ids = [...new Set(((data ?? []) as MemoryMatch[]).filter((m) => m.source_id !== sourceId && m.similarity > 0.5).map((m) => m.source_id))].slice(0, 3);
  if (ids.length === 0) return [];
  const { data: sources } = await scope.client.from("memory_sources").select("id, title, kind").in("id", ids);
  return (sources ?? []) as Pick<MemorySource, "id" | "title" | "kind">[];
}
