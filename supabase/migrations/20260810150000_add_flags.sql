-- Phase 4 of the mastery-gate rebuild: feedback/correction loop.
-- One table for both flag sources -- a kid's soft "I didn't get it" and a
-- parent's hard "this content is wrong" are structurally identical rows
-- (who, which phrase, when, optional note), discriminated by `source`/
-- `kind` rather than split into two tables.
--
-- Deliberately no family/tenant scoping: the project's existing extension
-- mechanism for another family is a separate Supabase project (billing
-- isolation, already in the PRD), not a shared multi-tenant database. A
-- family_id column here would have exactly one possible value forever
-- within this deployment while adding an implicit-filter obligation to
-- every query -- pure risk, no benefit.

create table flags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  phrase_id uuid not null references phrases(id) on delete cascade,
  source text not null check (source in ('kid', 'parent')),
  kind text not null check (kind in ('reshow', 'content_issue')),
  note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index flags_phrase_id_idx on flags (phrase_id);
create index flags_open_idx on flags (created_at) where resolved_at is null;

alter table flags enable row level security;
create policy "anon full access" on flags for all to anon using (true) with check (true);
