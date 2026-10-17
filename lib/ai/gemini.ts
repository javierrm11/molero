import "server-only";

import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// Único punto de contacto con el proveedor de IA. Si se cambia de proveedor, solo se toca lib/ai/.

export type AiTask =
  | "capture"
  | "script"
  | "hooks"
  | "adapt"
  | "topics"
  | "lead_message"
  | "review"
  | "chat"
  | "plan_day"
  | "context_update"
  | "briefing"
  | "night_checkin"
  | "coach_week"
  | "memory_ingest"
  | "memory_answer"
  | "brand_kit"
  | "piece";

export type AiTier = "lite" | "fast" | "pro";

export class AiError extends Error {}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/** Contexto para usar la IA sin sesión (cron, tareas en segundo plano): cliente admin + usuario. */
export interface ServerScope {
  client: SupabaseClient;
  userId: string;
}

export type Attachment = { mimeType: string; base64: string } | { fileUri: string; mimeType?: string };

export interface GenerateOptions {
  task: AiTask;
  system: string;
  prompt: string;
  /** Adjuntos: audio, PDF o un vídeo de YouTube por URL. */
  attachments?: Attachment[];
  history?: ChatTurn[];
  tier?: AiTier;
  scope?: ServerScope;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("Falta GEMINI_API_KEY en las variables de entorno.");
  return new GoogleGenAI({ apiKey });
}

function modelFor(tier: AiTier): string {
  if (tier === "pro") return process.env.GEMINI_MODEL_PRO ?? "gemini-pro-latest";
  if (tier === "lite") return process.env.GEMINI_MODEL_LITE ?? "gemini-flash-lite-latest";
  return process.env.GEMINI_MODEL_FAST ?? "gemini-flash-latest";
}

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;

function toPart(a: Attachment): Part {
  return "base64" in a ? { inlineData: { mimeType: a.mimeType, data: a.base64 } } : { fileData: { fileUri: a.fileUri, mimeType: a.mimeType } };
}

function buildContents(options: GenerateOptions): Content[] {
  const history: Content[] = (options.history ?? []).map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
  const parts: Part[] = [...(options.attachments ?? []).map(toPart), { text: options.prompt }];
  return [...history, { role: "user", parts }];
}

async function logUsage(scope: ServerScope | undefined, task: AiTask, model: string, input: number, output: number) {
  try {
    const row = { task, model, input_tokens: input, output_tokens: output };
    if (scope) await scope.client.from("ai_logs").insert({ ...row, user_id: scope.userId });
    else await (await createClient()).from("ai_logs").insert(row);
  } catch {
    // El registro de uso nunca debe romper la respuesta.
  }
}

async function call(options: GenerateOptions, json?: { schema: unknown }) {
  const model = modelFor(options.tier ?? "fast");
  let response;
  try {
    response = await getClient().models.generateContent({
      model,
      contents: buildContents(options),
      config: {
        systemInstruction: options.system,
        ...(json ? { responseMimeType: "application/json", responseJsonSchema: json.schema } : {}),
      },
    });
  } catch (error) {
    if (error instanceof AiError) throw error;
    console.error("[ai] error de Gemini", error);
    throw new AiError("Gemini no ha respondido. Prueba otra vez en un momento.");
  }

  const usage = response.usageMetadata;
  await logUsage(options.scope, options.task, model, usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0);

  const text = response.text?.trim();
  if (!text) throw new AiError("Gemini ha devuelto una respuesta vacía.");
  return text;
}

/** Genera texto libre. */
export async function generate(options: GenerateOptions): Promise<string> {
  return call(options);
}

/** Genera una respuesta estructurada y la valida con el esquema de zod. */
export async function generateJson<T>(options: GenerateOptions & { schema: z.ZodType<T> }): Promise<T> {
  const jsonSchema = z.toJSONSchema(options.schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  const text = await call(options, { schema: jsonSchema });
  try {
    return options.schema.parse(JSON.parse(text));
  } catch (error) {
    console.error("[ai] JSON inválido", text, error);
    throw new AiError("La respuesta de Gemini no tiene el formato esperado.");
  }
}

/**
 * Embeddings para la memoria. gemini-embedding-2 no usa task_type: la tarea va como prefijo del texto.
 * Devuelve un vector por texto, en el mismo orden.
 */
export async function embed(
  texts: string[],
  kind: "document" | "query",
  options: { title?: string; scope?: ServerScope } = {},
): Promise<number[][]> {
  const ai = getClient();
  const prefixed = texts.map((t) =>
    kind === "query" ? `task: search result | query: ${t}` : `title: ${options.title ?? "none"} | text: ${t}`,
  );
  const vectors: number[][] = [];
  const BATCH = 16;
  try {
    for (let i = 0; i < prefixed.length; i += BATCH) {
      const batch = prefixed.slice(i, i + BATCH);
      const res = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: batch.map((text) => ({ parts: [{ text }] })),
        config: { outputDimensionality: EMBEDDING_DIMENSIONS },
      });
      const values = (res.embeddings ?? []).map((e) => e.values ?? []);
      if (values.length !== batch.length || values.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error(`Embeddings inesperados: ${values.length}/${batch.length}`);
      }
      vectors.push(...values);
    }
  } catch (error) {
    console.error("[ai] error de embeddings", error);
    throw new AiError("No se han podido indexar los textos.");
  }
  // Los embeddings se cobran por tokens de entrada; estimación de ~4 caracteres por token.
  const approxTokens = Math.round(prefixed.reduce((sum, t) => sum + t.length, 0) / 4);
  await logUsage(options.scope, kind === "query" ? "memory_answer" : "memory_ingest", EMBEDDING_MODEL, approxTokens, 0);
  return vectors;
}

/** Mensaje de error apto para mostrar en la interfaz. */
export function aiErrorMessage(error: unknown): string {
  return error instanceof AiError ? error.message : "Algo ha fallado al hablar con la IA.";
}
