-- Fix-up migration: the initial schema migration (20260808160217) was edited
-- in place after it had already been applied to the remote database, so the
-- CLI's migration tracking skipped re-running it. This migration brings the
-- remote schema up to what 20260808160217 now describes, so the seed
-- migration (20260809000000) can apply cleanly. Lesson: never edit an
-- already-applied migration again -- always add a new one.

alter table phrases add column if not exists needs_audio boolean not null default true;
alter table phrases add column if not exists paired_phrase_id uuid references phrases(id);
alter table phrases add column if not exists word_gloss text;

create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) on delete set null,
  phrase_id uuid references phrases(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table tips enable row level security;

drop policy if exists "anon full access" on tips;
create policy "anon full access" on tips for all to anon using (true) with check (true);
