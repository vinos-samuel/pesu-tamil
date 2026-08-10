-- Phase 2 of the mastery-gate rebuild: resumable "encounter runs" replace
-- the old block-by-tier session (all Learn, then all Recognize, then
-- Say-it...) that made a 19-phrase unit ~60 screens in one sitting.
--
-- A new table, not columns on `profiles` -- run lifecycle (created /
-- resumed / completed) doesn't belong on the kid-identity row, and a
-- fixed set of columns there would hardcode "at most one in-flight run
-- ever" onto the wrong table. `where profile_id = X and completed_at is
-- null` naturally expresses "the current resumable run" instead.

create table session_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  queue jsonb not null, -- ordered [{type, phraseId}]
  current_index int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz, -- null = resumable
  updated_at timestamptz not null default now()
);

create index session_runs_profile_active_idx on session_runs (profile_id) where completed_at is null;

alter table session_runs enable row level security;
create policy "anon full access" on session_runs for all to anon using (true) with check (true);
