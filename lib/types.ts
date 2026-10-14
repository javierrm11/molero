// Tipos de las filas de Supabase (ver migrations/1.sql).

export type BrandSection =
  | "quien_soy"
  | "posicionamiento"
  | "tono_y_estilo"
  | "pilares"
  | "servicios"
  | "productos"
  | "redes"
  | "objetivos";

export interface BrandContext {
  id: string;
  section: BrandSection;
  content: string;
  updated_at: string;
}

export type CaptureType = "idea" | "lead" | "task" | "context";

export interface Capture {
  id: string;
  type: CaptureType;
  title: string | null;
  raw_text: string | null;
  audio_url: string | null;
  ai: Record<string, unknown>;
  processed: boolean;
  result_ref: string | null;
  created_at: string;
}

export type Pillar = "ensenar" | "construir" | "vida";
export type ContentFormat = "carousel" | "short" | "long_video" | "post" | "live";
export type ContentStatus = "idea" | "script" | "recorded" | "edited" | "published";
export type Platform = "linkedin" | "tiktok" | "youtube" | "instagram";

export interface Content {
  id: string;
  title: string;
  pillar: Pillar | null;
  series: string | null;
  format: ContentFormat | null;
  platforms: Platform[];
  status: ContentStatus;
  hook: string | null;
  script: string | null;
  cta: string | null;
  planned_at: string | null;
  published_at: string | null;
  links: Record<string, string>;
  metrics: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = "new" | "contacted" | "interested" | "proposal" | "won" | "lost";
export type LeadSource =
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "instagram"
  | "puerta_fria"
  | "referido"
  | "web"
  | "otro";

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  sector: string | null;
  city: string | null;
  source: LeadSource | null;
  service_interest: string | null;
  status: LeadStatus;
  next_step: string | null;
  follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InteractionType = "call" | "message" | "meeting" | "email";

export interface Interaction {
  id: string;
  lead_id: string;
  type: InteractionType;
  summary: string;
  date: string;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price_from: number | null;
  price_to: number | null;
  active: boolean;
}

export interface Client {
  id: string;
  lead_id: string | null;
  name: string;
  company: string | null;
  contact: string | null;
  created_at: string;
}

export type ProjectStatus = "active" | "delivered" | "paused" | "cancelled";

export interface Project {
  id: string;
  client_id: string;
  service_id: string | null;
  title: string;
  amount: number | null;
  status: ProjectStatus;
  start_at: string | null;
  end_at: string | null;
}

export type GoalMetric = "contents" | "contacts";

export interface Goal {
  id: string;
  week_start: string;
  metric: GoalMetric;
  target: number;
  actual: number;
}

export interface WeeklyReview {
  id: string;
  week_start: string;
  metrics: Record<string, { followers?: number; reach?: number }>;
  wins: string | null;
  losses: string | null;
  ai_summary: string | null;
  plan: string | null;
  created_at: string;
}

export type BlockType =
  | "study"
  | "class"
  | "record"
  | "edit"
  | "live"
  | "upload"
  | "sales"
  | "admin"
  | "rest";
export type BlockStatus = "planned" | "active" | "done" | "skipped";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface TimeBlock {
  id: string;
  start_at: string;
  end_at: string;
  type: BlockType;
  title: string;
  content_id: string | null;
  lead_id: string | null;
  status: BlockStatus;
  checklist: ChecklistItem[];
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface TemplateBlock {
  start: string; // "HH:MM"
  end: string;
  type: BlockType;
  title: string;
}

export interface BlockTemplate {
  id: string;
  name: string;
  blocks: TemplateBlock[];
}

export interface Settings {
  user_id: string;
  focus_token: string;
  focus_shortcuts: Partial<Record<BlockType, string>>;
  focus_off_shortcut: string;
  focus_enabled: boolean;
}
