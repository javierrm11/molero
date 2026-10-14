import type {
  BlockType,
  BrandSection,
  CaptureType,
  ContentFormat,
  ContentStatus,
  GoalMetric,
  InteractionType,
  LeadSource,
  LeadStatus,
  Pillar,
  Platform,
  ProjectStatus,
  TemplateBlock,
} from "@/lib/types";

/** Clases de color por tono (fondo suave + texto oscuro). Literales para que Tailwind las detecte. */
export const TONES = {
  green: { bg: "bg-accent-tint", text: "text-accent-dark", dot: "bg-accent" },
  blue: { bg: "bg-sky-tint", text: "text-sky-ink", dot: "bg-sky-ink" },
  violet: { bg: "bg-violet-tint", text: "text-violet-ink", dot: "bg-violet-ink" },
  peach: { bg: "bg-peach-tint", text: "text-peach-ink", dot: "bg-peach-ink" },
  butter: { bg: "bg-butter-tint", text: "text-butter-ink", dot: "bg-butter-ink" },
  pink: { bg: "bg-pink-tint", text: "text-pink-ink", dot: "bg-pink-ink" },
  grey: { bg: "bg-grey-tint", text: "text-muted", dot: "bg-muted" },
} as const;

export type Tone = keyof typeof TONES;

// ── Agenda y modo foco ──────────────────────────────────────

export const BLOCK_TYPES: Record<
  BlockType,
  { label: string; tone: Tone; checklist: string[]; defaultShortcut: string }
> = {
  study: {
    label: "Estudiar",
    tone: "blue",
    checklist: ["Objetivo de la sesión claro", "Móvil lejos de la mesa", "Pomodoro 1", "Pomodoro 2", "Pomodoro 3", "Resumen en 3 líneas"],
    defaultShortcut: "Molero Foco Estudiar",
  },
  class: {
    label: "Clase",
    tone: "blue",
    checklist: ["Llegar a tiempo", "Apuntes del día", "Dudas apuntadas"],
    defaultShortcut: "Molero Foco Estudiar",
  },
  record: {
    label: "Grabar",
    tone: "green",
    checklist: ["Guion abierto en el móvil", "Luz y audio probados", "Hook · 3 tomas", "Desarrollo y demo", "CTA final"],
    defaultShortcut: "Molero Foco Grabar",
  },
  edit: {
    label: "Editar",
    tone: "violet",
    checklist: ["Importar tomas", "Corte y ritmo", "Subtítulos", "Música y sonido", "Exportar"],
    defaultShortcut: "Molero Foco Editar",
  },
  live: {
    label: "Directo",
    tone: "pink",
    checklist: ["Tema y guion", "Prueba de audio y vídeo", "Anunciar el directo", "Hacer el directo", "Guardar clips"],
    defaultShortcut: "Molero Foco Directo",
  },
  upload: {
    label: "Subir",
    tone: "butter",
    checklist: ["Título y descripción", "Portada o miniatura", "Hashtags y CTA", "Publicado", "Links guardados en el pipeline"],
    defaultShortcut: "Molero Foco Subir",
  },
  sales: {
    label: "Ventas",
    tone: "peach",
    checklist: ["Revisar «Hoy toca»", "Enviar seguimientos", "Contactos nuevos", "Registrar interacciones"],
    defaultShortcut: "Molero Foco Ventas",
  },
  admin: {
    label: "Gestión",
    tone: "grey",
    checklist: ["Lista de tareas", "Hecho"],
    defaultShortcut: "Molero Foco Gestion",
  },
  rest: {
    label: "Descanso",
    tone: "grey",
    checklist: [],
    defaultShortcut: "",
  },
};

export const BLOCK_TYPE_ORDER: BlockType[] = [
  "study",
  "class",
  "record",
  "edit",
  "live",
  "upload",
  "sales",
  "admin",
  "rest",
];

export const DEFAULT_TEMPLATES: { name: string; blocks: TemplateBlock[] }[] = [
  {
    name: "Día de clase",
    blocks: [
      { start: "08:30", end: "14:30", type: "class", title: "Clases en la UCO" },
      { start: "16:30", end: "18:30", type: "study", title: "Estudiar" },
      { start: "19:00", end: "19:45", type: "sales", title: "Seguimientos" },
    ],
  },
  {
    name: "Día de grabación",
    blocks: [
      { start: "10:00", end: "12:00", type: "study", title: "Estudiar" },
      { start: "16:00", end: "17:30", type: "record", title: "Grabar en lote" },
      { start: "17:45", end: "18:30", type: "edit", title: "Editar" },
      { start: "21:00", end: "21:20", type: "upload", title: "Subir contenido" },
    ],
  },
  {
    name: "Día de ventas",
    blocks: [
      { start: "10:00", end: "12:00", type: "study", title: "Estudiar" },
      { start: "17:00", end: "17:45", type: "sales", title: "Seguimientos del CRM" },
      { start: "17:45", end: "18:30", type: "sales", title: "Contactos nuevos" },
    ],
  },
];

// ── Contenido ───────────────────────────────────────────────

export const PILLARS: Record<Pillar, { label: string; tone: Tone }> = {
  ensenar: { label: "Enseñar", tone: "blue" },
  construir: { label: "Construir en público", tone: "green" },
  vida: { label: "Vida de estudiante", tone: "peach" },
};

export const CONTENT_STATUSES: Record<ContentStatus, string> = {
  idea: "Idea",
  script: "Guion",
  recorded: "Grabado",
  edited: "Editado",
  published: "Publicado",
};
export const CONTENT_STATUS_ORDER: ContentStatus[] = ["idea", "script", "recorded", "edited", "published"];

export const FORMATS: Record<ContentFormat, string> = {
  carousel: "Carrusel",
  short: "Short",
  long_video: "Vídeo largo",
  post: "Post",
  live: "Directo",
};

export const PLATFORMS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
};

// ── CRM ─────────────────────────────────────────────────────

export const LEAD_STATUSES: Record<LeadStatus, { label: string; tone: Tone }> = {
  new: { label: "Nuevo", tone: "grey" },
  contacted: { label: "Contactado", tone: "blue" },
  interested: { label: "Interesado", tone: "violet" },
  proposal: { label: "Propuesta", tone: "peach" },
  won: { label: "Ganado", tone: "green" },
  lost: { label: "Perdido", tone: "grey" },
};
export const LEAD_STATUS_ORDER: LeadStatus[] = ["new", "contacted", "interested", "proposal", "won", "lost"];

export const LEAD_SOURCES: Record<LeadSource, string> = {
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  puerta_fria: "Puerta fría",
  referido: "Referido",
  web: "Web",
  otro: "Otro",
};

export const INTERACTION_TYPES: Record<InteractionType, string> = {
  call: "Llamada",
  message: "Mensaje",
  meeting: "Reunión",
  email: "Email",
};

export const PROJECT_STATUSES: Record<ProjectStatus, { label: string; tone: Tone }> = {
  active: { label: "En curso", tone: "violet" },
  delivered: { label: "Entregado", tone: "green" },
  paused: { label: "En pausa", tone: "butter" },
  cancelled: { label: "Cancelado", tone: "grey" },
};

export const DEFAULT_SERVICES = [
  { name: "Web a medida", description: "Webs y aplicaciones a medida para negocios." },
  { name: "IA y automatizaciones", description: "Integración de IA y automatización de procesos en empresas." },
  { name: "Creativos con IA", description: "Creativos publicitarios generados con IA." },
];

// ── Captura y revisión ──────────────────────────────────────

export const CAPTURE_TYPES: Record<CaptureType, { label: string; tone: Tone }> = {
  idea: { label: "Idea", tone: "green" },
  lead: { label: "Lead", tone: "peach" },
  task: { label: "Tarea", tone: "blue" },
  context: { label: "Contexto", tone: "violet" },
};

export const GOAL_METRICS: Record<GoalMetric, { label: string; defaultTarget: number }> = {
  contents: { label: "Contenidos", defaultTarget: 5 },
  contacts: { label: "Contactos", defaultTarget: 10 },
};

export const NETWORKS = ["linkedin", "tiktok", "youtube", "instagram"] as const satisfies readonly Platform[];

export const BRAND_SECTIONS: Record<BrandSection, { label: string; hint: string }> = {
  quien_soy: { label: "Quién soy", hint: "Bio, historia, formación y stack." },
  posicionamiento: { label: "Posicionamiento", hint: "Propuesta de valor, públicos y diferenciación." },
  tono_y_estilo: { label: "Tono y estilo", hint: "Cómo hablas, palabras que sí y que no, hooks, CTAs y reglas fijas." },
  pilares: { label: "Pilares", hint: "Pilares de contenido y series activas." },
  servicios: { label: "Servicios", hint: "Catálogo, qué incluye cada uno, precios y casos de éxito." },
  productos: { label: "Productos", hint: "Productos propios y su estado." },
  redes: { label: "Redes", hint: "Handles, rol de cada red y seguidores." },
  objetivos: { label: "Objetivos", hint: "Objetivos del trimestre." },
};
export const BRAND_SECTION_ORDER = Object.keys(BRAND_SECTIONS) as BrandSection[];
