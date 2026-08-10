-- Phase 3 of the mastery-gate rebuild: "Nests" -- adjacent-word clusters
-- tested via a "which one fits this situation?" encounter. All Tamil
-- content and audio already exist and are already native-reviewed; this
-- only adds English situational prompts, batch-drafted and reviewed the
-- same way as every other content decision in this project (see
-- docs/nests-draft.md) -- never generated live, nothing here reaches
-- Savyr until seeded from an approved file.
--
-- `phrases.paired_phrase_id` is a dead end for this: it's a 1:1 FK and
-- most real contrast groups have 3+ members (pothum/konjam/neraya, etc.)
-- -- see docs/curriculum-phrases.md. Migrating its 2 existing pairs into
-- proper clusters and retiring the column.

create table clusters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  note text, -- dev-only, mirrors phrases.notes style
  created_at timestamptz not null default now()
);

create table cluster_members (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references clusters(id) on delete cascade,
  phrase_id uuid not null references phrases(id) on delete cascade,
  unique (cluster_id, phrase_id)
);

create table situational_prompts (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references clusters(id) on delete cascade,
  correct_phrase_id uuid not null references phrases(id) on delete cascade,
  situation_en text not null, -- kid-facing, reviewed before shipping
  created_at timestamptz not null default now()
);

create index cluster_members_phrase_id_idx on cluster_members (phrase_id);
create index situational_prompts_cluster_id_idx on situational_prompts (cluster_id);

alter table clusters enable row level security;
alter table cluster_members enable row level security;
alter table situational_prompts enable row level security;
create policy "anon full access" on clusters for all to anon using (true) with check (true);
create policy "anon full access" on cluster_members for all to anon using (true) with check (true);
create policy "anon full access" on situational_prompts for all to anon using (true) with check (true);

-- Migrate the 2 existing paired_phrase_id pairs into real clusters.
insert into clusters (slug, note) values
  ('saapdu-register', 'eat (peer/cousin) vs eat (respectful, to elders)'),
  ('negative-imperative', '-aadhey "don''t" pattern');

insert into cluster_members (cluster_id, phrase_id)
select c.id, p.id from clusters c, phrases p
where c.slug = 'saapdu-register' and p.slug in ('saapdu', 'saapidunga');

insert into cluster_members (cluster_id, phrase_id)
select c.id, p.id from clusters c, phrases p
where c.slug = 'negative-imperative' and p.slug in ('satham-podaadhey', 'azhaadhey');

alter table phrases drop column if exists paired_phrase_id;

-- New encounter type: hear a situation, pick which cluster member fits.
alter table attempts drop constraint if exists attempts_tier_check;
alter table attempts add constraint attempts_tier_check
  check (tier in ('learn', 'recognize', 'reverse-recognize', 'say-it', 'build-it', 'cluster'));
