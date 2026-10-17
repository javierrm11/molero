import "server-only";

import { z } from "zod";

import { BLOCK_TYPE_ORDER, BLOCK_TYPES, BRAND_SECTION_ORDER, FORMATS, LEAD_SOURCES, PILLARS, PLATFORMS } from "@/lib/constants";

// Esquemas de las respuestas estructuradas y textos de las peticiones a la IA.

const pillar = z.enum(Object.keys(PILLARS) as [keyof typeof PILLARS, ...(keyof typeof PILLARS)[]]);
const format = z.enum(Object.keys(FORMATS) as [keyof typeof FORMATS, ...(keyof typeof FORMATS)[]]);
const platform = z.enum(Object.keys(PLATFORMS) as [keyof typeof PLATFORMS, ...(keyof typeof PLATFORMS)[]]);
const source = z.enum(Object.keys(LEAD_SOURCES) as [keyof typeof LEAD_SOURCES, ...(keyof typeof LEAD_SOURCES)[]]);
const blockType = z.enum(BLOCK_TYPE_ORDER as [string, ...string[]]);
const brandSection = z.enum(BRAND_SECTION_ORDER as [string, ...string[]]);
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

// ── Captura ─────────────────────────────────────────────────

export const captureSchema = z.object({
  transcript: z.string().describe("Transcripción literal si había audio; si no, el texto original."),
  type: z.enum(["idea", "lead", "task", "context"]),
  title: z.string().describe("Título corto y claro, en español."),
  idea: z
    .object({
      pillar: pillar.nullable(),
      format: format.nullable(),
      platforms: z.array(platform),
      hook: z.string().nullable(),
    })
    .nullable(),
  lead: z
    .object({
      name: z.string(),
      company: z.string().nullable(),
      sector: z.string().nullable(),
      city: z.string().nullable(),
      source: source.nullable(),
      service_interest: z.string().nullable(),
      next_step: z.string().nullable(),
      follow_up_at: z.string().nullable().describe("Fecha YYYY-MM-DD si se menciona."),
    })
    .nullable(),
  task: z
    .object({
      date: z.string().nullable().describe("Fecha YYYY-MM-DD si se menciona."),
      time: z.string().nullable().describe("Hora HH:MM si se menciona."),
      block_type: blockType.nullable(),
    })
    .nullable(),
  context: z.object({ section: brandSection, note: z.string() }).nullable(),
});
export type CaptureAi = z.infer<typeof captureSchema>;

export function capturePrompt(today: string, text: string | undefined, hasAudio: boolean): string {
  return `Hoy es ${today}. Javier ha hecho una captura rápida${hasAudio ? " por voz (audio adjunto)" : ""}.
${text ? `Texto: """${text}"""` : ""}

1. ${hasAudio ? "Transcribe el audio." : "Copia el texto en transcript."}
2. Clasifícala: idea (de contenido), lead (contacto o negocio interesado), task (algo que hacer en un momento concreto) o context (información sobre la marca, precios, objetivos…).
3. Rellena solo el bloque que corresponda a su tipo (idea, lead, task o context) y deja los demás a null.
- Para una idea: sugiere pilar, formato, plataformas y un hook en el tono de Javier.
- Para un lead: extrae los datos que se mencionen; no inventes los que falten.
- Para una tarea: fecha, hora y tipo de bloque de agenda (${BLOCK_TYPE_ORDER.map((t) => `${t}=${BLOCK_TYPES[t].label}`).join(", ")}).
- Para contexto: la sección del Cerebro a la que afecta y la nota resumida.`;
}

// ── Contenido ───────────────────────────────────────────────

export const scriptSchema = z.object({
  hook: z.string(),
  script: z.string().describe("Guion completo, en markdown, listo para grabar."),
  cta: z.string(),
});

export const hooksSchema = z.object({ hooks: z.array(z.string()).min(5).max(10) });

export const adaptSchema = z.object({ text: z.string() });

export const topicsSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string(),
        pillar,
        format,
        platforms: z.array(platform),
        hook: z.string(),
        why: z.string().describe("Por qué encaja ahora, en una frase."),
      }),
    )
    .min(3)
    .max(6),
});

export interface ContentBrief {
  title: string;
  pillar: string | null;
  format: string | null;
  platforms: string[];
  hook: string | null;
  script: string | null;
  cta: string | null;
}

function brief(c: ContentBrief): string {
  return `Título: ${c.title}
Pilar: ${c.pillar ?? "sin definir"} · Formato: ${c.format ?? "sin definir"} · Plataformas: ${c.platforms.join(", ") || "sin definir"}
Hook actual: ${c.hook ?? "—"}
Guion actual: ${c.script ?? "—"}
CTA actual: ${c.cta ?? "—"}`;
}

export function scriptPrompt(c: ContentBrief): string {
  return `Escribe el guion de este contenido con hook, desarrollo y CTA. Adáptalo al formato (un carrusel va por diapositivas, un short dura menos de 60 s, un vídeo largo lleva secciones).
${brief(c)}`;
}

export function hooksPrompt(c: ContentBrief): string {
  return `Dame 10 hooks alternativos para este contenido, distintos entre sí (pregunta, contradicción, dato, historia, reto…). Máximo 15 palabras cada uno.
${brief(c)}`;
}

export function adaptPrompt(c: ContentBrief, target: string): string {
  return `Adapta este contenido a ${target}. Respeta las convenciones de esa red (longitud, saltos de línea, hashtags si aplica) y el tono de Javier. Devuelve el texto listo para publicar.
${brief(c)}`;
}

export function topicsPrompt(): string {
  return `Propón entre 4 y 6 temas nuevos de contenido para las próximas semanas. Reparte entre los tres pilares, no repitas temas ya tratados y apóyate en lo que mejor ha funcionado.`;
}

// ── CRM ─────────────────────────────────────────────────────

export const leadMessageSchema = z.object({ message: z.string() });

export function leadMessagePrompt(input: {
  kind: "first" | "follow_up";
  lead: string;
  interactions: string;
  extra?: string;
}): string {
  return `Redacta un mensaje de ${input.kind === "first" ? "primer contacto" : "seguimiento"} para este lead. Breve (máximo 90 palabras), cercano, con una propuesta concreta y una pregunta final fácil de responder. Usa los servicios del Cerebro.
Lead:
${input.lead}
Interacciones previas:
${input.interactions || "Ninguna."}
${input.extra ? `Indicaciones de Javier: ${input.extra}` : ""}`;
}

// ── Revisión semanal ────────────────────────────────────────

export function reviewPrompt(data: string): string {
  return `Haz el resumen de la revisión semanal de Javier con estos datos. Estructura en markdown con tres apartados: **Qué funcionó**, **Qué no** y **Qué repetir la semana que viene**. Máximo 150 palabras, concreto y accionable.
${data}`;
}

// ── Agenda ──────────────────────────────────────────────────

export const planDaySchema = z.object({
  summary: z.string().describe("Una o dos frases explicando la lógica del plan."),
  blocks: z.array(
    z.object({
      start: hhmm,
      end: hhmm,
      type: blockType,
      title: z.string(),
    }),
  ),
});
export type PlanDay = z.infer<typeof planDaySchema>;

export function planDayPrompt(date: string, request: string): string {
  return `Organiza el día ${date} de Javier en bloques de tiempo (time blocking).
Lo que pide: """${request}"""
Reglas:
- Respeta los bloques que ya tiene en la agenda de ese día y no los dupliques; propón solo bloques nuevos que no se solapen.
- Tiene 3–4 horas a la semana para la marca: bloques de contenido de 45–120 min, ventas 45 min.
- Prioriza lo que vence antes en el pipeline y los seguimientos pendientes.
- Deja descansos y no planifiques más allá de las 22:30.
- Tipos de bloque: ${BLOCK_TYPE_ORDER.map((t) => `${t} (${BLOCK_TYPES[t].label})`).join(", ")}.`;
}

// ── Cerebro ─────────────────────────────────────────────────

export const contextUpdateSchema = z.object({
  section: brandSection,
  content: z.string().describe("Contenido completo y actualizado de la sección, en markdown."),
  reason: z.string().describe("Qué ha cambiado, en una frase."),
});
export type ContextUpdate = z.infer<typeof contextUpdateSchema>;

export function contextUpdatePrompt(note: string): string {
  return `Javier ha pegado esta información nueva sobre su marca:
"""${note}"""
Decide qué sección del Cerebro debe cambiar y devuelve el contenido completo de esa sección ya actualizado (conserva lo que siga siendo válido).`;
}

// ── Asistente ───────────────────────────────────────────────

export const QUICK_ACTIONS = [
  { id: "plan_tomorrow", label: "Organízame mañana", prompt: "Organízame mañana." },
  { id: "linkedin_post", label: "Post de LinkedIn", prompt: "Escríbeme un post de LinkedIn sobre el último proyecto que he construido." },
  { id: "week_ideas", label: "Ideas para la semana", prompt: "Dame ideas de contenido para esta semana, una por pilar." },
  { id: "follow_up", label: "Mensaje de seguimiento", prompt: "Redáctame un mensaje de seguimiento para el lead más urgente." },
  { id: "month_summary", label: "Resume mi mes", prompt: "Resume cómo va mi mes: contenido, ventas y qué ajustar." },
] as const;

// ── Panel de vida: resumen matinal ──────────────────────────

export const briefingSchema = z.object({
  focus: z.string().describe("La única cosa más importante del día, en una o dos frases."),
  summary: z.string().describe("Resumen del día en 2-3 frases, para leer en 20 segundos."),
  items: z
    .array(
      z.object({
        source: z.enum(["gmail", "calendar", "tasks", "crm", "contenido", "uco", "agenda"]),
        text: z.string().describe("Una frase accionable. Nombra al remitente o el evento."),
      }),
    )
    .max(6),
});
export type BriefingAi = z.infer<typeof briefingSchema>;

export function briefingPrompt(date: string, data: string): string {
  return `Prepara el resumen de la mañana de Javier para el ${date}. Datos de sus herramientas:
${data}

Reglas:
- Prioriza lo que exige una acción hoy: correos que hay que contestar, entregas de la universidad, llamadas y seguimientos de clientes.
- Ignora boletines, promociones y notificaciones automáticas.
- Máximo 6 puntos en items, de más a menos importante.
- No inventes nada que no esté en los datos.`;
}

// ── Revisión nocturna ───────────────────────────────────────

export const nightSchema = z.object({
  good: z.string().describe("Lo que ha ido bien hoy, concreto, en una o dos frases."),
  improve: z.string().describe("Una sola cosa a mejorar, con el patrón si se repite."),
  tomorrow: z
    .object({
      start: hhmm,
      end: hhmm,
      type: blockType,
      title: z.string(),
    })
    .nullable()
    .describe("Un bloque para mañana que ataque lo que hay que mejorar, o null si no hace falta."),
});
export type NightAi = z.infer<typeof nightSchema>;

export function nightPrompt(input: { date: string; mood: number | null; note: string; stats: string; history: string }): string {
  return `Revisión nocturna de Javier del ${input.date}.
Nota que se pone (1-5): ${input.mood ?? "sin nota"}.
Lo que cuenta: """${input.note || "(no ha escrito nada)"}"""
Bloques de la agenda: ${input.stats}
Últimas noches:
${input.history || "Sin historial."}

Sé un coach directo y amable: reconoce lo concreto que ha ido bien y propone UNA mejora pequeña y realista. Si detectas un patrón que se repite en las últimas noches, dilo.`;
}

export const coachSchema = z.object({
  good: z.array(z.string()).min(1).max(4),
  pattern: z.string().describe("El patrón que más se repite (bueno o malo), con datos."),
  one_change: z.string().describe("Un solo cambio concreto para la semana siguiente."),
  change_block: z
    .object({ start: hhmm, end: hhmm, type: blockType, title: z.string() })
    .nullable()
    .describe("Si el cambio se puede poner en la agenda de lunes a viernes, el bloque; si no, null."),
});
export type CoachAi = z.infer<typeof coachSchema>;

export function coachPrompt(data: string): string {
  return `Haz el informe semanal de hábitos de Javier a partir de sus revisiones nocturnas y su agenda:
${data}

Busca patrones (horas en las que se pierde el foco, días flojos, relación con el sueño o la carga de clase). Propón UN solo cambio, pequeño y medible.`;
}

// ── Memoria y biblioteca ────────────────────────────────────

export const ingestSchema = z.object({
  title: z.string().describe("Título claro de la fuente."),
  summary: z.string().describe("Resumen de 2-4 frases."),
  key_points: z.array(z.string()).min(1).max(6).describe("Ideas clave aprendidas, una frase cada una."),
  topics: z.array(z.string()).max(4).describe("Temas en una o dos palabras, p. ej. IA, Ventas, Productividad."),
});
export type IngestAi = z.infer<typeof ingestSchema>;

export function ingestPrompt(kind: string, text: string): string {
  return `Resume esta fuente (${kind}) para la memoria personal de Javier. Escribe en español aunque el original esté en otro idioma.
"""
${text}
"""`;
}

export const videoSchema = ingestSchema.extend({
  channel: z.string().nullable(),
  duration: z.string().nullable().describe("Duración aproximada, p. ej. 18 min."),
  notes: z.string().describe("Apuntes detallados del vídeo (400-1200 palabras), en español, con lo que se explica paso a paso."),
});
export type VideoAi = z.infer<typeof videoSchema>;

export const VIDEO_PROMPT = `Mira este vídeo y prepara su ficha para la memoria personal de Javier, en español: título, canal, duración, resumen, ideas clave, temas y apuntes detallados de lo que se explica.`;

export const ocrPrompt = "Transcribe todo el texto de este PDF tal cual, página a página, separando cada página con una línea «--- página N ---». No resumas.";

export const answerSchema = z.object({
  answer: z.string().describe("Respuesta en markdown. Cita los fragmentos con [n]."),
  citations: z.array(z.number().int()).describe("Números de los fragmentos usados."),
});

export function answerPrompt(question: string, fragments: string): string {
  return `Responde a la pregunta de Javier usando SOLO estos fragmentos de su memoria. Cita con [n] los que uses. Si no está en los fragmentos, dilo claramente y sugiere qué podría subir.
Fragmentos:
${fragments}

Pregunta: ${question}`;
}

// ── Kit de marca y piezas ───────────────────────────────────

export const BRAND_FONTS = [
  "Manrope",
  "Sora",
  "Outfit",
  "Figtree",
  "Plus Jakarta Sans",
  "DM Sans",
  "Space Grotesk",
  "Bricolage Grotesque",
  "Onest",
  "Unbounded",
] as const;

export const brandKitSchema = z.object({
  tone: z.array(z.string()).min(2).max(5),
  brand_values: z.array(z.string()).min(2).max(5),
  voice: z.string().describe("Una frase que describa cómo habla la marca, en primera persona."),
  colors: z
    .array(z.object({ name: z.string(), hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }))
    .length(5)
    .describe("Principal, oscuro para texto, fondo claro, acento claro y acento cálido. Contraste AA del texto sobre el fondo."),
  display_font: z.enum(BRAND_FONTS),
  body_font: z.enum(BRAND_FONTS),
});
export type BrandKitAi = z.infer<typeof brandKitSchema>;

export const BRAND_KIT_PROMPT =
  "Propón el kit de marca de Molero a partir del Cerebro: tono, valores, voz, 5 colores (con nombre en español) y tipografías de la lista. Coherente con un perfil Full Stack + IA cercano, no corporativo.";

export const pieceSchema = z.object({
  title: z.string(),
  slides: z
    .array(
      z.object({
        kind: z.enum(["hook", "content", "list", "cta"]),
        title: z.string().describe("Texto grande de la diapositiva, máximo 12 palabras."),
        body: z.string().nullable().describe("Texto secundario, máximo 35 palabras. En list, una línea por punto."),
      }),
    )
    .min(1)
    .max(8),
});
export type PieceAi = z.infer<typeof pieceSchema>;

export function piecePrompt(format: "carousel" | "cover" | "linkedin", brief: ContentBrief): string {
  const rules = {
    carousel: "Carrusel de 5 a 7 diapositivas: la primera es el hook (kind hook), luego contenido o listas y la última un CTA (kind cta).",
    cover: "Portada de vídeo de YouTube: UNA sola diapositiva kind hook con un título de máximo 6 palabras, muy legible.",
    linkedin: "Imagen para un post de LinkedIn: UNA sola diapositiva kind hook o list con la idea principal.",
  }[format];
  return `Convierte este contenido en una pieza visual. ${rules}
${brief.title}
Hook: ${brief.hook ?? "—"}
Guion: ${brief.script ?? "—"}
CTA: ${brief.cta ?? "—"}`;
}
