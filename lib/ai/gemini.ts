import "server-only";

import { GoogleGenAI, type Content, type Part } from "@google/genai";
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
  | "context_update";

export type AiTier = "fast" | "pro";

export class AiError extends Error {}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface GenerateOptions {
  task: AiTask;
  system: string;
  prompt: string;
  /** Adjuntos binarios (p. ej. el audio de una captura). */
  attachments?: { mimeType: string; base64: string }[];
  history?: ChatTurn[];
  tier?: AiTier;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("Falta GEMINI_API_KEY en las variables de entorno.");
  return new GoogleGenAI({ apiKey });
}

function modelFor(tier: AiTier): string {
  return tier === "pro"
    ? (process.env.GEMINI_MODEL_PRO ?? "gemini-pro-latest")
    : (process.env.GEMINI_MODEL_FAST ?? "gemini-flash-latest");
}

function buildContents(options: GenerateOptions): Content[] {
  const history: Content[] = (options.history ?? []).map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
  const parts: Part[] = [
    ...(options.attachments ?? []).map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.base64 } })),
    { text: options.prompt },
  ];
  return [...history, { role: "user", parts }];
}

async function logUsage(task: AiTask, model: string, input: number, output: number) {
  try {
    const supabase = await createClient();
    await supabase.from("ai_logs").insert({ task, model, input_tokens: input, output_tokens: output });
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
  await logUsage(options.task, model, usage?.promptTokenCount ?? 0, usage?.candidatesTokenCount ?? 0);

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

/** Mensaje de error apto para mostrar en la interfaz. */
export function aiErrorMessage(error: unknown): string {
  return error instanceof AiError ? error.message : "Algo ha fallado al hablar con la IA.";
}
