-- Molero HQ · migración inicial (v1 + agenda y modo foco)
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar, o `supabase db execute -f migrations/1.sql`.
--
-- Cambios respecto al modelo de molero.md §7:
--   · Todas las tablas llevan `user_id` (default auth.uid()) para que las políticas RLS puedan filtrar.
--   · `captures` añade `title` y `ai` (jsonb con la estructura que propone Gemini).
--   · Nuevas tablas del módulo M6 (agenda y modo foco): `time_blocks`, `block_templates`, `settings`.

-- ─────────────────────────────────────────────────────────────
-- Utilidades
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- M0 · Cerebro Molero
-- ─────────────────────────────────────────────────────────────
create table public.brand_context (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section     text not null check (section in (
                'quien_soy', 'posicionamiento', 'tono_y_estilo', 'pilares',
                'servicios', 'productos', 'redes', 'objetivos')),
  content     text not null default '',
  updated_at  timestamptz not null default now(),
  unique (user_id, section)
);

-- ─────────────────────────────────────────────────────────────
-- M1 · Captura rápida
-- ─────────────────────────────────────────────────────────────
create table public.captures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null default 'idea' check (type in ('idea', 'lead', 'task', 'context')),
  title       text,
  raw_text    text,
  audio_url   text,
  ai          jsonb not null default '{}'::jsonb,
  processed   boolean not null default false,
  result_ref  text,
  created_at  timestamptz not null default now()
);
create index captures_inbox_idx on public.captures (user_id, processed, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- M2 · Pipeline de contenido
-- ─────────────────────────────────────────────────────────────
create table public.contents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null,
  pillar        text check (pillar in ('ensenar', 'construir', 'vida')),
  series        text,
  format        text check (format in ('carousel', 'short', 'long_video', 'post', 'live')),
  platforms     text[] not null default '{}',
  status        text not null default 'idea' check (status in ('idea', 'script', 'recorded', 'edited', 'published')),
  hook          text,
  script        text,
  cta           text,
  planned_at    date,
  published_at  date,
  links         jsonb not null default '{}'::jsonb,
  metrics       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index contents_status_idx on public.contents (user_id, status, planned_at);

-- ─────────────────────────────────────────────────────────────
-- M3 · CRM ligero
-- ─────────────────────────────────────────────────────────────
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  description  text,
  price_from   numeric(10, 2),
  price_to     numeric(10, 2),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  company           text,
  sector            text,
  city              text,
  source            text check (source in ('linkedin', 'tiktok', 'youtube', 'instagram', 'puerta_fria', 'referido', 'web', 'otro')),
  service_interest  text,
  status            text not null default 'new' check (status in ('new', 'contacted', 'interested', 'proposal', 'won', 'lost')),
  next_step         text,
  follow_up_at      date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index leads_follow_up_idx on public.leads (user_id, status, follow_up_at);

create table public.interactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  type        text not null check (type in ('call', 'message', 'meeting', 'email')),
  summary     text not null,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);
create index interactions_lead_idx on public.interactions (lead_id, date desc);

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_id     uuid references public.leads (id) on delete set null,
  name        text not null,
  company     text,
  contact     text,
  created_at  timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id   uuid not null references public.clients (id) on delete cascade,
  service_id  uuid references public.services (id) on delete set null,
  title       text not null,
  amount      numeric(10, 2),
  status      text not null default 'active' check (status in ('active', 'delivered', 'paused', 'cancelled')),
  start_at    date,
  end_at      date,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- M4 · Revisión semanal
-- ─────────────────────────────────────────────────────────────
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null,
  metric      text not null check (metric in ('contents', 'contacts')),
  target      integer not null check (target >= 0),
  actual      integer not null default 0,
  unique (user_id, week_start, metric)
);

create table public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null,
  metrics     jsonb not null default '{}'::jsonb,
  wins        text,
  losses      text,
  ai_summary  text,
  plan        text,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ─────────────────────────────────────────────────────────────
-- M5 · Registro de uso de la IA
-- ─────────────────────────────────────────────────────────────
create table public.ai_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task           text not null,
  model          text not null,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  created_at     timestamptz not null default now()
);
create index ai_logs_created_idx on public.ai_logs (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- M6 · Agenda y modo foco
-- ─────────────────────────────────────────────────────────────
create table public.time_blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  type         text not null check (type in ('study', 'class', 'record', 'edit', 'live', 'upload', 'sales', 'admin', 'rest')),
  title        text not null,
  content_id   uuid references public.contents (id) on delete set null,
  lead_id      uuid references public.leads (id) on delete set null,
  status       text not null default 'planned' check (status in ('planned', 'active', 'done', 'skipped')),
  checklist    jsonb not null default '[]'::jsonb,
  notes        text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  check (end_at > start_at)
);
create index time_blocks_day_idx on public.time_blocks (user_id, start_at);

create table public.block_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  blocks      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Ajustes personales: atajos de iOS por tipo de bloque y token para las automatizaciones.
create table public.settings (
  user_id             uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  focus_token         text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  focus_shortcuts     jsonb not null default '{}'::jsonb,
  focus_off_shortcut  text not null default 'Molero Foco Off',
  focus_enabled       boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Triggers de updated_at
-- ─────────────────────────────────────────────────────────────
create trigger brand_context_updated_at before update on public.brand_context
  for each row execute function public.set_updated_at();
create trigger contents_updated_at before update on public.contents
  for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS: cada fila solo es visible para su dueño
-- ─────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'brand_context', 'captures', 'contents', 'services', 'leads', 'interactions',
    'clients', 'projects', 'goals', 'weekly_reviews', 'ai_logs',
    'time_blocks', 'block_templates', 'settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo el dueño" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Storage: audios de las capturas por voz (bucket privado)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

create policy "captures: leer los míos" on storage.objects for select to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "captures: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "captures: borrar los míos" on storage.objects for delete to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);
