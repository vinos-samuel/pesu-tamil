-- Produce-tier redesign (advisor review, 2026-08-09): no client-side ASR.
-- Produce splits into two real sub-tiers:
--   say-it    -- record self, compare to native audio, self-grade + later
--               parent thumbs-up/down. Never a hard right/wrong -- excluded
--               from SRS scheduling (app-logic rule, not enforced in SQL).
--   build-it  -- word-order tapping, only for phrases with >=2 word_gloss
--               entries. Genuinely gradable, feeds SRS same as recognize.
-- attempts.tier now reflects these instead of a single 'produce' bucket.
-- No existing attempts rows to migrate -- table has been empty since launch.

alter table attempts drop constraint if exists attempts_tier_check;
alter table attempts add constraint attempts_tier_check
  check (tier in ('learn', 'recognize', 'say-it', 'build-it'));

alter table attempts alter column correct drop not null;
alter table attempts add column if not exists self_grade boolean; -- say-it: true = "Same!", false = "Not quite"
alter table attempts add column if not exists parent_grade boolean; -- say-it: filled in later from the parent dashboard
alter table attempts add column if not exists recording_path text; -- say-it: Storage path to the kid's own recording

-- Units 2 (Family) & 4 (Numbers) now get real audio too -- the original
-- "text-pronunciation only" call assumed audio was only needed for Learn.
-- Say-it needs something to compare against, so it breaks without audio.
-- Decided with Vinos 2026-08-09: record them (~26 short single-word clips).
update phrases set needs_audio = true
where unit_id in (select id from units where slug in ('family', 'numbers'));
