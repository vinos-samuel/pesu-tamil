-- Pesu Tamil v1 schema
-- No auth (per PRD: no-sign-in, "who's playing?" profile picker).
-- RLS is enabled with permissive anon policies, matching the locked decision
-- that the private app URL is the only access gate for v1.

create extension if not exists "pgcrypto";

-- One row per kid. No auth — selected via "who's playing?" picker.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_color text,
  streak_count int not null default 0,
  total_xp int not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

-- Unit 1, Unit 2, etc.
create table units (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  slug text not null unique,
  title text not null,
  created_at timestamptz not null default now()
);

-- Individual phrases within a unit.
create table phrases (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  seq int not null,
  slug text not null,
  english text not null,
  tamil_romanized text not null, -- internal reference only, never shown to the learner
  audio_path text, -- Storage object path, e.g. unit-1-greetings/01-vanakkam.m4a
  needs_audio boolean not null default true, -- false for units taught as text-pronunciation only (no native recording), e.g. Units 2 & 4
  notes text, -- register flags, alt phrasing, contrast/opposite/question-form callouts (dev-only, never shown verbatim to the learner)
  word_gloss text, -- word-by-word breakdown for multi-word phrases, e.g. "thanni = water, vaenum = want" -- USER-FACING (shown in-app as a caption), unlike notes. Null where the phrase is a single root word with nothing to break down.
  paired_phrase_id uuid references phrases(id), -- links a phrase to its one clearest contrast partner (e.g. saapdu <-> saapidunga) for quiz-style comprehension checks; not used for every contrast, only the clean 1:1 ones -- see docs/curriculum-phrases.md
  created_at timestamptz not null default now(),
  unique (unit_id, seq)
);

-- Creature tied 1:1 to a phrase (Learn tier: tap creature -> hear phrase).
create table creatures (
  id uuid primary key default gen_random_uuid(),
  phrase_id uuid not null unique references phrases(id) on delete cascade,
  species text not null, -- e.g. peacock, jasmine, horns, otter, flame
  color text,
  level int not null default 1,
  created_at timestamptz not null default now()
);

-- Per-rep attempt log (primary signal for the content growth loop).
create table attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  phrase_id uuid not null references phrases(id) on delete cascade,
  tier text not null check (tier in ('learn', 'recognize', 'produce')),
  correct boolean not null,
  created_at timestamptz not null default now()
);

-- Derived per-profile, per-phrase mastery state (simple SRS, rule-based).
create table progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  phrase_id uuid not null references phrases(id) on delete cascade,
  mastery_state text not null default 'new' check (mastery_state in ('new', 'learning', 'review', 'mastered')),
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  next_review_at timestamptz,
  creature_unlocked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (profile_id, phrase_id)
);

-- Short text callouts (register, pronunciation, grammar-pattern nuance) --
-- plain language only, never grammar jargon in the wording (matches the
-- "no grammar terminology" non-goal). Attached to a specific phrase where
-- relevant so the app can surface it right when that phrase comes up.
create table tips (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) on delete set null,
  phrase_id uuid references phrases(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index attempts_profile_id_idx on attempts (profile_id);
create index attempts_phrase_id_idx on attempts (phrase_id);
create index progress_profile_id_idx on progress (profile_id);
create index phrases_unit_id_idx on phrases (unit_id);

-- RLS: no auth in v1, so policies are permissive for the anon key.
-- Access control for this app is "you have the private URL", not row-level identity.
alter table profiles enable row level security;
alter table units enable row level security;
alter table phrases enable row level security;
alter table creatures enable row level security;
alter table attempts enable row level security;
alter table progress enable row level security;
alter table tips enable row level security;

create policy "anon full access" on profiles for all to anon using (true) with check (true);
create policy "anon full access" on units for all to anon using (true) with check (true);
create policy "anon full access" on phrases for all to anon using (true) with check (true);
create policy "anon full access" on creatures for all to anon using (true) with check (true);
create policy "anon full access" on attempts for all to anon using (true) with check (true);
create policy "anon full access" on progress for all to anon using (true) with check (true);
create policy "anon full access" on tips for all to anon using (true) with check (true);
