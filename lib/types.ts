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
  // Migración 2 (pueden faltar si aún no se ha aplicado)
  telegram_chat_id?: string | null;
  telegram_link_code?: string;
  morning_brief?: boolean;
  night_checkin?: boolean;
}

// ── Migración 2 ─────────────────────────────────────────────

export interface GoogleAccount {
  user_id: string;
  email: string;
  refresh_token: string;
  access_token: string | null;
  expires_at: string | null;
  scopes: string[];
}

export interface BriefingItem {
  source: "gmail" | "calendar" | "tasks" | "crm" | "contenido" | "uco" | "agenda";
  text: string;
}

export interface Briefing {
  id: string;
  date: string;
  focus: string;
  summary: string;
  items: BriefingItem[];
  stats: { emails?: number; to_reply?: number; tasks?: number; follow_ups?: number; blocks?: number; minutes?: number };
  sent_at: string | null;
  created_at: string;
}

export type MemoryKind = "pdf" | "note" | "web" | "youtube" | "tiktok" | "instagram" | "article" | "book";
export type MemoryStatus = "pending" | "processing" | "ready" | "error";

export interface MemorySource {
  id: string;
  kind: MemoryKind;
  title: string;
  url: string | null;
  file_path: string | null;
  file_size: number | null;
  status: MemoryStatus;
  error: string | null;
  in_library: boolean;
  summary: string | null;
  key_points: string[];
  topics: string[];
  user_note: string | null;
  body: string | null;
  meta: { pages?: number; duration?: string; channel?: string; author?: string; words?: number; chunks?: number };
  consumed_at: string | null;
  created_at: string;
}

export interface MemoryMatch {
  id: string;
  source_id: string;
  idx: number;
  page: number | null;
  content: string;
  similarity: number;
}

export interface SuggestedBlock {
  date: string;
  start: string;
  end: string;
  type: BlockType;
  title: string;
}

export interface DailyCheckin {
  id: string;
  date: string;
  mood: number | null;
  note: string | null;
  ai_good: string | null;
  ai_improve: string | null;
  ai_tomorrow: SuggestedBlock | null;
  applied: boolean;
}

export interface CoachReport {
  id: string;
  week_start: string;
  good: string[];
  pattern: string | null;
  one_change: string | null;
  change_block: { start: string; end: string; type: BlockType; title: string } | null;
  applied: boolean;
}

export interface BrandColor {
  name: string;
  hex: string;
}

export interface BrandKit {
  user_id: string;
  tone: string[];
  brand_values: string[];
  voice: string | null;
  colors: BrandColor[];
  display_font: string;
  body_font: string;
  logo_text: string;
}

export type PieceFormat = "carousel" | "cover" | "linkedin";

export interface Slide {
  kind: "hook" | "content" | "list" | "cta";
  title: string;
  body: string | null;
}

export interface BrandPiece {
  id: string;
  content_id: string | null;
  format: PieceFormat;
  title: string;
  slides: Slide[];
  created_at: string;
}
