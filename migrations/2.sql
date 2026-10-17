-- Molero HQ · migración 2: panel de vida, segundo cerebro, biblioteca, revisión nocturna y kit de marca.
-- Ejecutar después de 1.sql, en el SQL Editor de Supabase.

create extension if not exists vector with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Ajustes: Telegram y hora de los avisos
-- ─────────────────────────────────────────────────────────────
alter table public.settings
  add column if not exists telegram_chat_id   text,
  add column if not exists telegram_link_code text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists morning_brief      boolean not null default true,
  add column if not exists night_checkin      boolean not null default true;

-- ─────────────────────────────────────────────────────────────
-- 1 · Panel de vida: cuenta de Google y resúmenes matinales
-- ─────────────────────────────────────────────────────────────
-- Los tokens se guardan cifrados (AES-GCM) con TOKEN_ENCRYPTION_KEY; la base de datos nunca los ve en claro.
create table public.google_accounts (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email          text not null,
  refresh_token  text not null,
  access_token   text,
  expires_at     timestamptz,
  scopes         text[] not null default '{}',
  connected_at   timestamptz not null default now()
);

create table public.briefings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  focus       text not null,
  summary     text not null,
  items       jsonb not null default '[]'::jsonb,
  stats       jsonb not null default '{}'::jsonb,
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- 2 y 5 · Segundo cerebro y biblioteca (misma memoria)
-- ─────────────────────────────────────────────────────────────
create table public.memory_sources (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('pdf', 'note', 'web', 'youtube', 'tiktok', 'instagram', 'article', 'book')),
  title         text not null,
  url           text,
  file_path     text,
  file_size     bigint,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error         text,
  in_library    boolean not null default false,
  summary       text,
  key_points    jsonb not null default '[]'::jsonb,
  topics        text[] not null default '{}',
  user_note     text,
  body          text,
  meta          jsonb not null default '{}'::jsonb,
  consumed_at   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index memory_sources_idx on public.memory_sources (user_id, created_at desc);

create table public.memory_chunks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_id   uuid not null references public.memory_sources (id) on delete cascade,
  idx         integer not null,
  page        integer,
  content     text not null,
  embedding   extensions.vector(768) not null,
  created_at  timestamptz not null default now()
);
create index memory_chunks_source_idx on public.memory_chunks (source_id, idx);
create index memory_chunks_embedding_idx on public.memory_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- Búsqueda semántica. Con la sesión del usuario respeta RLS; con la service role hay que pasar p_user.
create or replace function public.match_memory_chunks(
  query_embedding extensions.vector(768),
  match_count int default 8,
  p_source uuid default null,
  p_user uuid default null
)
returns table (id uuid, source_id uuid, idx int, page int, content text, similarity float)
language sql
stable
set search_path = public, extensions
as $$
  select c.id, c.source_id, c.idx, c.page, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from public.memory_chunks c
  where c.user_id = coalesce(p_user, auth.uid())
    and (p_source is null or c.source_id = p_source)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3 · Revisión nocturna
-- ─────────────────────────────────────────────────────────────
create table public.daily_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null,
  mood          integer check (mood between 1 and 5),
  note          text,
  ai_good       text,
  ai_improve    text,
  ai_tomorrow   jsonb,
  applied       boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

create table public.coach_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start   date not null,
  good         jsonb not null default '[]'::jsonb,
  pattern      text,
  one_change   text,
  change_block jsonb,
  applied      boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ─────────────────────────────────────────────────────────────
-- 4 · Kit de marca y piezas
-- ─────────────────────────────────────────────────────────────
create table public.brand_kit (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  tone        text[] not null default '{}',
  brand_values text[] not null default '{}',
  voice       text,
  colors      jsonb not null default '[]'::jsonb,
  display_font text not null default 'Manrope',
  body_font   text not null default 'Manrope',
  logo_text   text not null default 'M',
  updated_at  timestamptz not null default now()
);

create table public.brand_pieces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content_id  uuid references public.contents (id) on delete set null,
  format      text not null check (format in ('carousel', 'cover', 'linkedin')),
  title       text not null,
  slides      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Triggers y RLS
-- ─────────────────────────────────────────────────────────────
create trigger memory_sources_updated_at before update on public.memory_sources
  for each row execute function public.set_updated_at();
create trigger brand_kit_updated_at before update on public.brand_kit
  for each row execute function public.set_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array[
    'google_accounts', 'briefings', 'memory_sources', 'memory_chunks',
    'daily_checkins', 'coach_reports', 'brand_kit', 'brand_pieces'
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

-- Bucket privado para los PDFs de la memoria.
insert into storage.buckets (id, name, public)
values ('memory', 'memory', false)
on conflict (id) do nothing;

create policy "memory: leer los míos" on storage.objects for select to authenticated
  using (bucket_id = 'memory' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "memory: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'memory' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "memory: borrar los míos" on storage.objects for delete to authenticated
  using (bucket_id = 'memory' and (storage.foldername(name))[1] = (select auth.uid())::text);
